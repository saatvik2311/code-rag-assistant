# Python Data Structures & Patterns

## Lists
```python
# List comprehension
squares = [x**2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]
flattened = [x for row in matrix for x in row]

# Slicing
arr[start:stop:step]
arr[::-1]  # reverse
arr[::2]   # every other

# Common operations
arr.append(x)       # O(1) amortized
arr.insert(i, x)    # O(n)
arr.pop()            # O(1)
arr.pop(0)           # O(n) — use deque instead
arr.sort(key=lambda x: x[1], reverse=True)  # Timsort O(n log n)
```

## Dictionaries (HashMap equivalent)
```python
# defaultdict for frequency counting
from collections import defaultdict, Counter
freq = defaultdict(int)
for c in s:
    freq[c] += 1

# Counter shorthand
freq = Counter(s)
most_common = freq.most_common(3)  # top 3

# Dictionary comprehension
squared = {k: v**2 for k, v in d.items()}

# OrderedDict for LRU-like behavior
from collections import OrderedDict
```

## Sets
```python
s = set()
s.add(x)           # O(1)
s.discard(x)       # O(1), no error
s.remove(x)        # O(1), raises KeyError
s1 & s2             # intersection
s1 | s2             # union
s1 - s2             # difference
s1 ^ s2             # symmetric difference
```

## Deque (Double-ended queue)
```python
from collections import deque
dq = deque()
dq.append(x)       # O(1) right
dq.appendleft(x)   # O(1) left
dq.pop()            # O(1) right
dq.popleft()        # O(1) left
dq.rotate(k)        # rotate right by k
```

## Heap (Priority Queue)
```python
import heapq
heap = []
heapq.heappush(heap, item)     # O(log n)
heapq.heappop(heap)             # O(log n)
heapq.nlargest(k, iterable)    # O(n log k)
heapq.nsmallest(k, iterable)   # O(n log k)

# Max heap trick: negate values
heapq.heappush(heap, -val)
```

## Common Patterns

### Two Pointers
```python
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target: return [left, right]
        elif s < target: left += 1
        else: right -= 1
```

### Sliding Window
```python
def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum
```

### Binary Search
```python
from bisect import bisect_left, bisect_right, insort

def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1
```

### BFS / DFS
```python
from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

def dfs(graph, node, visited=None):
    if visited is None: visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```

### Dynamic Programming
```python
# Bottom-up (tabulation)
def fib(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

# Top-down (memoization)
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```

### Sorting
```python
# Custom sorting
students.sort(key=lambda s: (-s.grade, s.name))

# Sort by multiple keys
from operator import itemgetter
data.sort(key=itemgetter(1, 0))
```

## String Operations
```python
s.split(delimiter)       # split into list
delimiter.join(list)     # join list into string
s.strip()                # remove whitespace
s.startswith(prefix)
s.endswith(suffix)
s.isalnum(), s.isalpha(), s.isdigit()
s.lower(), s.upper()
s.replace(old, new)
s.count(sub)
s.find(sub)              # -1 if not found
s.index(sub)             # ValueError if not found
```

## Itertools
```python
from itertools import combinations, permutations, product, accumulate, chain, groupby

combinations('ABCD', 2)     # AB AC AD BC BD CD
permutations('ABC')          # all orderings
product([0,1], repeat=3)    # 000 001 010 ... 111
accumulate([1,2,3,4])       # prefix sums: 1 3 6 10
```
