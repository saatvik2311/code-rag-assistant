# Java HashMap

## Overview
`HashMap<K, V>` is a hash table-based implementation of the `Map` interface in `java.util`. It stores key-value pairs and allows O(1) average time complexity for `get()` and `put()` operations. It permits one null key and multiple null values. It is NOT thread-safe (use `ConcurrentHashMap` for thread safety).

## Internal Working
- Uses an **array of buckets** (default initial capacity: 16).
- Each bucket stores a linked list (or a balanced tree if the list grows beyond 8 entries — **treeification** since Java 8).
- A **hash function** determines the bucket index: `index = hash(key) & (n - 1)`.
- **Load factor** (default 0.75): when the map size exceeds `capacity * loadFactor`, the array is **resized** (doubled) and all entries are **rehashed**.

## Collision Handling
When two keys hash to the same bucket:
1. **Separate Chaining**: entries are stored as a linked list in the bucket.
2. **Treeification** (Java 8+): when a bucket's list exceeds 8 nodes (and total capacity ≥ 64), the list converts to a **red-black tree** for O(log n) lookup within that bucket.
3. **Untreeification**: when tree size drops below 6, it converts back to a linked list.

## Key Methods

| Method | Description | Time Complexity |
|--------|-------------|-----------------|
| `put(K key, V value)` | Insert or update a key-value pair | O(1) avg, O(log n) worst |
| `get(Object key)` | Retrieve value by key | O(1) avg, O(log n) worst |
| `remove(Object key)` | Remove entry by key | O(1) avg |
| `containsKey(Object key)` | Check if key exists | O(1) avg |
| `containsValue(Object value)` | Check if value exists | O(n) |
| `keySet()` | Return set of all keys | O(1) |
| `values()` | Return collection of all values | O(1) |
| `entrySet()` | Return set of all key-value entries | O(1) |
| `getOrDefault(K key, V default)` | Get value or return default | O(1) avg |
| `putIfAbsent(K key, V value)` | Insert only if key doesn't exist | O(1) avg |
| `computeIfAbsent(K key, Function)` | Compute value if key is absent | O(1) avg |
| `merge(K key, V value, BiFunction)` | Merge values for a key | O(1) avg |

## Common Patterns

### Frequency Counter
```java
Map<Character, Integer> freq = new HashMap<>();
for (char c : str.toCharArray()) {
    freq.merge(c, 1, Integer::sum);
    // OR: freq.put(c, freq.getOrDefault(c, 0) + 1);
}
```

### Group By (Anagram Grouping)
```java
Map<String, List<String>> groups = new HashMap<>();
for (String word : words) {
    char[] chars = word.toCharArray();
    Arrays.sort(chars);
    String key = new String(chars);
    groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
}
```

### Two Sum Pattern
```java
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }
        map.put(nums[i], i);
    }
    return new int[]{};
}
```

### Subarray Sum Equals K (Prefix Sum + HashMap)
```java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);
    int sum = 0, count = 0;
    for (int num : nums) {
        sum += num;
        count += prefixCount.getOrDefault(sum - k, 0);
        prefixCount.merge(sum, 1, Integer::sum);
    }
    return count;
}
```

### LRU Cache using LinkedHashMap
```java
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    public LRUCache(int capacity) {
        super(capacity, 0.75f, true); // accessOrder=true
        this.capacity = capacity;
    }
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;
    }
}
```

## hashCode() and equals() Contract
- If `a.equals(b)` is true, then `a.hashCode() == b.hashCode()` must be true.
- If you override `equals()`, you MUST override `hashCode()`.
- Objects used as HashMap keys should be **immutable** (e.g., String, Integer).

## HashMap vs Other Maps

| Feature | HashMap | TreeMap | LinkedHashMap | ConcurrentHashMap |
|---------|---------|---------|---------------|-------------------|
| Order | No order | Sorted by key | Insertion order | No order |
| Null keys | 1 allowed | Not allowed | 1 allowed | Not allowed |
| Thread-safe | No | No | No | Yes |
| Get/Put | O(1) | O(log n) | O(1) | O(1) |

## Tips for Competitive Programming
1. Use `HashMap` for O(1) lookups over linear search.
2. Use `getOrDefault()` and `merge()` for cleaner code.
3. For sorted key iteration, use `TreeMap`.
4. For character frequency, an `int[26]` array is faster than HashMap.
5. Watch out for auto-boxing overhead with primitive types — consider specialized maps from Eclipse Collections or Trove for competitive use.
