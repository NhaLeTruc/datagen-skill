import { TableDefinition, ColumnDefinition, ConstraintDefinition } from '../../types';
import { ValueGenerator } from './value-generator';

export interface SelfReferencingConfig {
  maxDepth: number;
  nullPercentage: number;
}

export interface TieredRecord {
  tier: number;
  record: Record<string, any>;
}

export class SelfReferencingHandler {
  private config: SelfReferencingConfig;
  private valueGenerator: ValueGenerator;

  constructor(valueGenerator: ValueGenerator, config?: Partial<SelfReferencingConfig>) {
    this.valueGenerator = valueGenerator;
    this.config = {
      maxDepth: config?.maxDepth || 5,
      nullPercentage: config?.nullPercentage || 20
    };
  }

  identifySelfReferences(table: TableDefinition): ConstraintDefinition[] {
    return table.constraints.filter(constraint => {
      if (constraint.type !== 'FOREIGN_KEY') return false;
      return constraint.referencedTable === table.name;
    });
  }

  hasSelfReference(table: TableDefinition): boolean {
    return this.identifySelfReferences(table).length > 0;
  }

  async generateTieredRecords(
    table: TableDefinition,
    count: number,
    existingRecords: Record<string, any>[] = []
  ): Promise<TieredRecord[]> {
    const selfRefConstraints = this.identifySelfReferences(table);

    if (selfRefConstraints.length === 0) {
      throw new Error(`Table ${table.name} has no self-referencing foreign keys`);
    }

    const tieredRecords: TieredRecord[] = [];
    const recordsPerTier = this.distributeRecordsAcrossTiers(count);

    let currentId = existingRecords.length > 0
      ? Math.max(...existingRecords.map(r => r.id || 0)) + 1
      : 1;

    for (let tier = 0; tier < recordsPerTier.length; tier++) {
      const tierCount = recordsPerTier[tier];
      const availableParentIds = this.getAvailableParentIds(tieredRecords, tier);

      for (let i = 0; i < tierCount; i++) {
        const record = await this.generateRecord(
          table,
          currentId++,
          tier,
          availableParentIds,
          selfRefConstraints
        );

        tieredRecords.push({ tier, record });
      }
    }

    return tieredRecords;
  }

  private distributeRecordsAcrossTiers(count: number): number[] {
    const tiers = Math.min(this.config.maxDepth, Math.ceil(Math.log2(count)) + 1);
    const distribution: number[] = [];

    const rootCount = Math.max(1, Math.ceil(count * 0.15));
    distribution.push(rootCount);

    let remaining = count - rootCount;
    const growthFactor = 1.5;

    for (let tier = 1; tier < tiers && remaining > 0; tier++) {
      const tierCount = Math.min(
        remaining,
        Math.ceil(distribution[tier - 1] * growthFactor)
      );
      distribution.push(tierCount);
      remaining -= tierCount;
    }

    if (remaining > 0) {
      distribution[distribution.length - 1] += remaining;
    }

    return distribution;
  }

  private getAvailableParentIds(tieredRecords: TieredRecord[], currentTier: number): number[] {
    if (currentTier === 0) {
      return [];
    }

    return tieredRecords
      .filter(tr => tr.tier < currentTier)
      .map(tr => tr.record.id as number);
  }

  private async generateRecord(
    table: TableDefinition,
    id: number,
    tier: number,
    availableParentIds: number[],
    selfRefConstraints: ConstraintDefinition[]
  ): Promise<Record<string, any>> {
    const record: Record<string, any> = {};

    const pkColumn = table.columns.find(col =>
      table.constraints.some(c => c.type === 'PRIMARY_KEY' && c.columns?.includes(col.name))
    );

    if (pkColumn) {
      record[pkColumn.name] = id;
    }

    for (const column of table.columns) {
      if (column.name === pkColumn?.name) {
        continue;
      }

      const isSelfRefColumn = selfRefConstraints.some(c => c.columns?.includes(column.name));

      if (isSelfRefColumn) {
        record[column.name] = this.generateSelfReferenceValue(
          tier,
          availableParentIds,
          column.nullable
        );
      } else {
        record[column.name] = this.valueGenerator.generate(column, {
          rowIndex: 0,
          tableName: table.name,
          allData: new Map(),
          existingValues: new Map()
        });
      }
    }

    return record;
  }

  private generateSelfReferenceValue(
    tier: number,
    availableParentIds: number[],
    nullable: boolean
  ): number | null {
    if (tier === 0) {
      return null;
    }

    const shouldBeNull = nullable && Math.random() * 100 < this.config.nullPercentage;
    if (shouldBeNull) {
      return null;
    }

    if (availableParentIds.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableParentIds.length);
    return availableParentIds[randomIndex];
  }

  getTierStatistics(tieredRecords: TieredRecord[]): {
    totalTiers: number;
    recordsPerTier: Map<number, number>;
    maxDepth: number;
    rootRecords: number;
  } {
    const recordsPerTier = new Map<number, number>();

    for (const tr of tieredRecords) {
      recordsPerTier.set(tr.tier, (recordsPerTier.get(tr.tier) || 0) + 1);
    }

    const maxTier = Math.max(...tieredRecords.map(tr => tr.tier));

    return {
      totalTiers: recordsPerTier.size,
      recordsPerTier,
      maxDepth: maxTier,
      rootRecords: recordsPerTier.get(0) || 0
    };
  }

  validateTieredRecords(tieredRecords: TieredRecord[], selfRefConstraints: ConstraintDefinition[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const allIds = new Set(tieredRecords.map(tr => tr.record.id));

    for (const tr of tieredRecords) {
      for (const constraint of selfRefConstraints) {
        const column = constraint.columns?.[0];
        if (!column) continue;

        const foreignKeyValue = tr.record[column];

        if (foreignKeyValue !== null && foreignKeyValue !== undefined) {
          if (!allIds.has(foreignKeyValue)) {
            errors.push(
              `Record at tier ${tr.tier} with id ${tr.record.id} references non-existent id ${foreignKeyValue}`
            );
          }

          const referencedRecord = tieredRecords.find(r => r.record.id === foreignKeyValue);
          if (referencedRecord && referencedRecord.tier >= tr.tier) {
            errors.push(
              `Record at tier ${tr.tier} with id ${tr.record.id} references record at same or higher tier ${referencedRecord.tier}`
            );
          }
        }
      }

      if (tr.tier === 0) {
        for (const constraint of selfRefConstraints) {
          const column = constraint.columns?.[0];
          if (column && tr.record[column] !== null && tr.record[column] !== undefined) {
            errors.push(
              `Root record (tier 0) with id ${tr.record.id} has non-null self-reference`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
