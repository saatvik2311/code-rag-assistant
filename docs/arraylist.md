# Java ArrayList

## Overview
`ArrayList<E>` is a resizable array implementation of the `List` interface in `java.util`. It provides O(1) random access, O(1) amortized appending, but O(n) insertion/deletion in the middle.

## Internal Working
- Backed by a **dynamic array** (`Object[]`).
- Default initial capacity: **10**.
- When full, creates a new array of **1.5× the current size** and copies elements.
- Supports generics: `ArrayList<String>`, `ArrayList<Integer>`.

## Key Methods

| Method | Description | Time |
|--------|-------------|------|
| `add(E e)` | Append to end | O(1) amortized |
| `add(int index, E e)` | Insert at index | O(n) |
| `get(int index)` | Get element at index | O(1) |
| `set(int index, E e)` | Replace element at index | O(1) |
| `remove(int index)` | Remove by index | O(n) |
| `remove(Object o)` | Remove first occurrence | O(n) |
| `contains(Object o)` | Check existence | O(n) |
| `indexOf(Object o)` | Find first index | O(n) |
| `size()` | Number of elements | O(1) |
| `isEmpty()` | Check if empty | O(1) |
| `clear()` | Remove all elements | O(n) |
| `toArray()` | Convert to array | O(n) |
| `sort(Comparator)` | Sort in-place | O(n log n) |
| `subList(from, to)` | View of a range | O(1) |
| `Collections.swap(list, i, j)` | Swap two elements | O(1) |

## Common Patterns

### Initialize with Values
```java
List<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3));
List<Integer> list = new ArrayList<>(List.of(1, 2, 3)); // Java 9+
```

### Iterate
```java
// For-each
for (int val : list) { System.out.println(val); }

// Iterator (safe removal)
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() == target) it.remove();
}

// removeIf (Java 8+)
list.removeIf(x -> x % 2 == 0);
```

### Sort
```java
Collections.sort(list);                          // natural order
list.sort(Comparator.naturalOrder());             // same
list.sort(Comparator.reverseOrder());             // descending
list.sort((a, b) -> a.length() - b.length());    // by length
list.sort(Comparator.comparingInt(String::length)); // same, cleaner
```

### Convert Between Types
```java
// ArrayList to array
Integer[] arr = list.toArray(new Integer[0]);
int[] primitiveArr = list.stream().mapToInt(Integer::intValue).toArray();

// Array to ArrayList
List<Integer> list = new ArrayList<>(Arrays.asList(1, 2, 3));

// String to list of characters
List<Character> chars = str.chars().mapToObj(c -> (char) c).collect(Collectors.toList());
```

### Build Adjacency List for Graphs
```java
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
adj.get(u).add(v);
adj.get(v).add(u); // undirected
```

## ArrayList vs LinkedList vs Array

| Feature | ArrayList | LinkedList | Array |
|---------|-----------|------------|-------|
| Random access | O(1) | O(n) | O(1) |
| Add at end | O(1) amortized | O(1) | N/A (fixed) |
| Add at front | O(n) | O(1) | N/A |
| Remove | O(n) | O(1) if at node | N/A |
| Memory | Compact | Extra pointer overhead | Most compact |

## Tips
1. **Pre-size** if you know the count: `new ArrayList<>(n)` avoids resizing.
2. Use `ArrayList` over `LinkedList` in almost all cases — better cache locality.
3. For thread-safe list: `Collections.synchronizedList(new ArrayList<>())` or `CopyOnWriteArrayList`.
