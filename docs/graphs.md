# Java Graphs

## Overview
Graphs consist of vertices (nodes) and edges. They can be directed or undirected, weighted or unweighted.

## Graph Representations

### Adjacency List (preferred for sparse graphs)
```java
// Using ArrayList
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
adj.get(u).add(v);
adj.get(v).add(u); // for undirected

// Using HashMap (for non-integer nodes)
Map<String, List<String>> adj = new HashMap<>();
adj.computeIfAbsent("A", k -> new ArrayList<>()).add("B");

// Weighted graph
List<List<int[]>> adj = new ArrayList<>(); // int[] = {neighbor, weight}
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
adj.get(u).add(new int[]{v, weight});
```

### Adjacency Matrix (for dense graphs)
```java
int[][] adj = new int[n][n]; // 0 means no edge
adj[u][v] = 1; // or weight
adj[v][u] = 1; // for undirected
```

### Edge List
```java
int[][] edges = {{0,1}, {0,2}, {1,3}}; // [from, to]
int[][] edges = {{0,1,5}, {0,2,3}};    // [from, to, weight]
```

## BFS (Breadth-First Search)
O(V + E) — explores level by level. Use for **shortest path in unweighted graphs**.

```java
public void bfs(List<List<Integer>> adj, int start) {
    boolean[] visited = new boolean[adj.size()];
    Queue<Integer> queue = new LinkedList<>();
    visited[start] = true;
    queue.offer(start);
    
    while (!queue.isEmpty()) {
        int node = queue.poll();
        System.out.print(node + " ");
        for (int neighbor : adj.get(node)) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                queue.offer(neighbor);
            }
        }
    }
}
```

### BFS Shortest Path
```java
public int shortestPath(List<List<Integer>> adj, int src, int dest) {
    boolean[] visited = new boolean[adj.size()];
    Queue<int[]> queue = new LinkedList<>(); // {node, distance}
    visited[src] = true;
    queue.offer(new int[]{src, 0});
    
    while (!queue.isEmpty()) {
        int[] curr = queue.poll();
        if (curr[0] == dest) return curr[1];
        for (int neighbor : adj.get(curr[0])) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                queue.offer(new int[]{neighbor, curr[1] + 1});
            }
        }
    }
    return -1; // not reachable
}
```

## DFS (Depth-First Search)
O(V + E) — explores as deep as possible before backtracking.

### Recursive DFS
```java
public void dfs(List<List<Integer>> adj, int node, boolean[] visited) {
    visited[node] = true;
    System.out.print(node + " ");
    for (int neighbor : adj.get(node)) {
        if (!visited[neighbor]) {
            dfs(adj, neighbor, visited);
        }
    }
}
```

### Iterative DFS
```java
public void dfsIterative(List<List<Integer>> adj, int start) {
    boolean[] visited = new boolean[adj.size()];
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited[node]) continue;
        visited[node] = true;
        System.out.print(node + " ");
        for (int neighbor : adj.get(node)) {
            if (!visited[neighbor]) stack.push(neighbor);
        }
    }
}
```

## Common Graph Algorithms

### Number of Connected Components
```java
public int countComponents(int n, int[][] edges) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
    
    boolean[] visited = new boolean[n];
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            dfs(adj, i, visited);
            count++;
        }
    }
    return count;
}
```

### Detect Cycle (Undirected)
```java
public boolean hasCycle(List<List<Integer>> adj, int node, boolean[] visited, int parent) {
    visited[node] = true;
    for (int neighbor : adj.get(node)) {
        if (!visited[neighbor]) {
            if (hasCycle(adj, neighbor, visited, node)) return true;
        } else if (neighbor != parent) {
            return true;
        }
    }
    return false;
}
```

### Topological Sort (DAG only)
```java
public List<Integer> topologicalSort(int n, List<List<Integer>> adj) {
    int[] inDegree = new int[n];
    for (int u = 0; u < n; u++)
        for (int v : adj.get(u)) inDegree[v]++;
    
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < n; i++) if (inDegree[i] == 0) queue.offer(i);
    
    List<Integer> result = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        result.add(node);
        for (int neighbor : adj.get(node)) {
            if (--inDegree[neighbor] == 0) queue.offer(neighbor);
        }
    }
    return result.size() == n ? result : new ArrayList<>(); // empty if cycle exists
}
```

### Dijkstra's Algorithm (Weighted, Non-negative)
```java
public int[] dijkstra(List<List<int[]>> adj, int src) {
    int n = adj.size();
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]); // {node, dist}
    pq.offer(new int[]{src, 0});
    
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], d = curr[1];
        if (d > dist[u]) continue;
        for (int[] edge : adj.get(u)) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.offer(new int[]{v, dist[v]});
            }
        }
    }
    return dist;
}
```

### Union-Find (Disjoint Set Union)
```java
class UnionFind {
    int[] parent, rank;
    
    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]); // path compression
        return parent[x];
    }
    
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank[px] < rank[py]) { int temp = px; px = py; py = temp; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }
}
```

## Tips
1. **BFS** = shortest path (unweighted), **DFS** = connectivity, cycles, topological sort.
2. Use **adjacency list** for sparse graphs, **matrix** for dense.
3. `PriorityQueue` + adjacency list = efficient Dijkstra.
4. Union-Find is great for connectivity queries and Kruskal's MST.
