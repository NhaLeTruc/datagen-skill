import { SchemaDefinition, TableDefinition, ConstraintDefinition } from '../../types';

export interface CircularDependency {
  cycle: string[];
  foreignKeys: ConstraintDefinition[];
}

export interface ResolutionStrategy {
  type: 'nullable' | 'two-pass' | 'break-cycle';
  description: string;
  affectedTables: string[];
}

export class CircularDependencyResolver {
  private schema: SchemaDefinition;

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
  }

  detectCircularDependencies(): CircularDependency[] {
    const dependencies = this.buildDependencyGraph();
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    for (const table of this.schema.tables) {
      if (!visited.has(table.name)) {
        this.dfsDetectCycle(
          table.name,
          dependencies,
          visited,
          recursionStack,
          pathStack,
          cycles
        );
      }
    }

    return this.deduplicateCycles(cycles);
  }

  private buildDependencyGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const table of this.schema.tables) {
      if (!graph.has(table.name)) {
        graph.set(table.name, new Set());
      }

      for (const constraint of table.constraints) {
        if (constraint.type === 'FOREIGN_KEY' && constraint.referencedTable) {
          if (constraint.referencedTable !== table.name) {
            graph.get(table.name)!.add(constraint.referencedTable);
          }
        }
      }
    }

    return graph;
  }

  private dfsDetectCycle(
    current: string,
    graph: Map<string, Set<string>>,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    cycles: CircularDependency[]
  ): void {
    visited.add(current);
    recursionStack.add(current);
    pathStack.push(current);

    const neighbors = graph.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsDetectCycle(neighbor, graph, visited, recursionStack, pathStack, cycles);
      } else if (recursionStack.has(neighbor)) {
        const cycleStartIndex = pathStack.indexOf(neighbor);
        const cycle = pathStack.slice(cycleStartIndex);
        cycle.push(neighbor);

        const foreignKeys = this.extractForeignKeys(cycle);
        cycles.push({ cycle, foreignKeys });
      }
    }

    pathStack.pop();
    recursionStack.delete(current);
  }

  private extractForeignKeys(cycle: string[]): ConstraintDefinition[] {
    const foreignKeys: ConstraintDefinition[] = [];

    for (let i = 0; i < cycle.length - 1; i++) {
      const fromTable = cycle[i];
      const toTable = cycle[i + 1];

      const table = this.schema.tables.find(t => t.name === fromTable);
      if (!table) continue;

      const fk = table.constraints.find(
        c => c.type === 'FOREIGN_KEY' && c.referencedTable === toTable
      );

      if (fk) {
        foreignKeys.push(fk);
      }
    }

    return foreignKeys;
  }

  private deduplicateCycles(cycles: CircularDependency[]): CircularDependency[] {
    const uniqueCycles: CircularDependency[] = [];
    const seenCycles = new Set<string>();

    for (const cycle of cycles) {
      const normalizedCycle = this.normalizeCycle(cycle.cycle);
      const key = normalizedCycle.join('->');

      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        uniqueCycles.push(cycle);
      }
    }

    return uniqueCycles;
  }

  private normalizeCycle(cycle: string[]): string[] {
    const minTable = cycle.reduce((min, curr) => curr < min ? curr : min, cycle[0]);
    const minIndex = cycle.indexOf(minTable);
    const rotated = [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    return rotated.slice(0, -1);
  }

  determineResolutionStrategy(cycle: CircularDependency): ResolutionStrategy {
    const nullableForeignKeys = cycle.foreignKeys.filter(fk => {
      if (fk.type !== 'FOREIGN_KEY') return false;

      const tableName = cycle.cycle.find(t =>
        this.schema.tables.some(st => st.name === t && st.constraints.includes(fk))
      );

      if (!tableName) return false;
      const table = this.schema.tables.find(t => t.name === tableName);
      if (!table) return false;

      const column = table.columns.find(c => fk.columns?.includes(c.name));
      return column?.nullable === true;
    });

    if (nullableForeignKeys.length > 0) {
      return {
        type: 'nullable',
        description: 'Use nullable foreign keys strategy: generate records with NULL foreign keys first, then update',
        affectedTables: Array.from(new Set(cycle.cycle.slice(0, -1)))
      };
    }

    return {
      type: 'two-pass',
      description: 'Use two-pass strategy: generate all records first, then establish foreign key relationships',
      affectedTables: cycle.cycle.slice(0, -1)
    };
  }

  resolveGenerationOrder(): string[] {
    const dependencies = this.buildDependencyGraph();
    const cycles = this.detectCircularDependencies();

    const cycleTables = new Set(
      cycles.flatMap(c => c.cycle.slice(0, -1))
    );

    const nonCycleTables = this.schema.tables
      .map(t => t.name)
      .filter(name => !cycleTables.has(name));

    const orderedNonCycle = this.topologicalSort(nonCycleTables, dependencies);

    const cycleGroups: string[][] = [];
    for (const cycle of cycles) {
      const uniqueTables = Array.from(new Set(cycle.cycle.slice(0, -1)));
      cycleGroups.push(uniqueTables);
    }

    const merged = this.mergeCycleGroups(cycleGroups);

    const finalOrder: string[] = [];
    let nonCycleIndex = 0;
    let cycleIndex = 0;

    while (nonCycleIndex < orderedNonCycle.length || cycleIndex < merged.length) {
      if (nonCycleIndex < orderedNonCycle.length) {
        finalOrder.push(orderedNonCycle[nonCycleIndex++]);
      }

      if (cycleIndex < merged.length) {
        finalOrder.push(...merged[cycleIndex++]);
      }
    }

    return finalOrder;
  }

  private mergeCycleGroups(groups: string[][]): string[][] {
    if (groups.length === 0) return [];

    const merged: string[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < groups.length; i++) {
      if (used.has(i)) continue;

      const currentGroup = new Set(groups[i]);

      for (let j = i + 1; j < groups.length; j++) {
        if (used.has(j)) continue;

        const hasOverlap = groups[j].some(table => currentGroup.has(table));
        if (hasOverlap) {
          groups[j].forEach(table => currentGroup.add(table));
          used.add(j);
        }
      }

      merged.push(Array.from(currentGroup));
      used.add(i);
    }

    return merged;
  }

  private topologicalSort(tables: string[], dependencies: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, Set<string>>();

    for (const table of tables) {
      inDegree.set(table, 0);
      adjList.set(table, new Set());
    }

    for (const table of tables) {
      const deps = dependencies.get(table) || new Set();
      for (const dep of deps) {
        if (tables.includes(dep)) {
          adjList.get(dep)!.add(table);
          inDegree.set(table, (inDegree.get(table) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [table, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(table);
      }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const neighbors = adjList.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return sorted;
  }

  createTwoPassPlan(cycle: CircularDependency): {
    phase1: { table: string; columns: string[] }[];
    phase2: { table: string; columns: string[]; updates: string[] }[];
  } {
    const phase1: { table: string; columns: string[] }[] = [];
    const phase2: { table: string; columns: string[]; updates: string[] }[] = [];

    const tablesInCycle = new Set(cycle.cycle.slice(0, -1));

    for (const tableName of tablesInCycle) {
      const table = this.schema.tables.find(t => t.name === tableName);
      if (!table) continue;

      const cyclicFKColumns = cycle.foreignKeys
        .filter(fk => fk.type === 'FOREIGN_KEY' && table.constraints.includes(fk))
        .flatMap(fk => fk.columns || []);

      const nonCyclicColumns = table.columns
        .filter(col => !cyclicFKColumns.includes(col.name))
        .map(col => col.name);

      phase1.push({
        table: tableName,
        columns: nonCyclicColumns
      });

      if (cyclicFKColumns.length > 0) {
        phase2.push({
          table: tableName,
          columns: cyclicFKColumns,
          updates: cyclicFKColumns
        });
      }
    }

    return { phase1, phase2 };
  }
}
