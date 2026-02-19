Perfect — now we’ll upgrade the same list into an **interview meta-sheet** 👍

You asked:

> Same toughest 3 per domain
> But add:
> • Hard-level time complexity
> • Space complexity
> • Any special constraints / tricks / restrictions

So this becomes a **pattern + complexity + constraint map** — exactly how FAANG interviewers think.

---

# 🧠 1️⃣ ARRAYS

### 🔥 Toughest

1. **First Missing Positive**

   * Time → **O(n)**
   * Space → **O(1)**
   * Restrictions → Must use in-place hashing / index marking (no extra array)

2. **Trapping Rain Water**

   * Time → **O(n)**
   * Space → O(1) (two pointer) / O(n) (prefix arrays)
   * Trick → LeftMax / RightMax or monotonic stack

3. **Maximum Sum of 3 Non-Overlapping Subarrays**

   * Time → **O(n)**
   * Space → O(n)
   * Trick → Prefix sum + DP + index tracking

---

# 🧠 2️⃣ STRINGS

1. **Minimum Window Substring**

   * Time → **O(n)**
   * Space → O(128) / O(1)
   * Trick → Variable sliding window + freq deficit tracking

2. **Regular Expression Matching**

   * Time → **O(n·m)**
   * Space → O(n·m)
   * Trick → 2D DP + pattern state transitions

3. **Substring with Concatenation of All Words**

   * Time → **O(n · wordLen)**
   * Space → O(k) hashmap
   * Trick → Multi-offset sliding window

---

# 🧠 3️⃣ SLIDING WINDOW

1. **Sliding Window Maximum**

   * Time → **O(n)**
   * Space → O(k)
   * Trick → Monotonic deque

2. **Longest Substring with At Most K Distinct**

   * Time → **O(n)**
   * Space → O(k)
   * Trick → Variable window + hashmap shrink

3. **Count Number of Nice Subarrays**

   * Time → **O(n)**
   * Space → O(n) / O(1)
   * Trick → Prefix odd count / atMost(k) reduction

---

# 🧠 4️⃣ LINKED LIST

1. **Reverse Nodes in k-Group**

   * Time → **O(n)**
   * Space → O(1)
   * Trick → Segment reversal

2. **Copy List with Random Pointer**

   * Time → **O(n)**
   * Space → O(1) optimized / O(n) map
   * Trick → Interleaving nodes

3. **Flatten Multilevel Doubly Linked List**

   * Time → **O(n)**
   * Space → O(n) recursion stack
   * Trick → DFS flattening

---

# 🧠 5️⃣ STACK / QUEUE

1. **Largest Rectangle in Histogram**

   * Time → **O(n)**
   * Space → O(n)
   * Trick → Monotonic increasing stack

2. **Maximal Rectangle**

   * Time → **O(n·m)**
   * Space → O(m)
   * Trick → Convert rows → histogram

3. **Basic Calculator III**

   * Time → **O(n)**
   * Space → O(n)
   * Trick → Expression parsing + operator precedence

---

# 🧠 6️⃣ HEAP

1. **Find Median from Data Stream**

   * Time → O(log n) per insert
   * Space → O(n)
   * Trick → Two heap balancing

2. **Sliding Window Median**

   * Time → O(n log k)
   * Space → O(k)
   * Trick → Lazy deletion

3. **Merge k Sorted Lists**

   * Time → O(n log k)
   * Space → O(k)
   * Trick → Min heap merge

---

# 🧠 7️⃣ TREES

1. **Binary Tree Maximum Path Sum**

   * Time → **O(n)**
   * Space → O(h) recursion
   * Trick → Postorder DP

2. **Serialize Deserialize Binary Tree**

   * Time → **O(n)**
   * Space → O(n)
   * Trick → BFS / DFS encoding

3. **Nodes Distance K**

   * Time → **O(n)**
   * Space → O(n)
   * Trick → Parent mapping + BFS

---

# 🧠 8️⃣ BST

1. **Recover BST**

   * Time → **O(n)**
   * Space → O(1) Morris / O(h) stack
   * Trick → Inorder violation detection

2. **Kth Smallest**

   * Time → O(k) / O(n)
   * Space → O(h)
   * Trick → Inorder traversal

3. **Closest BST Value II**

   * Time → O(n)
   * Space → O(n)
   * Trick → Two stacks predecessor/successor

---

# 🧠 9️⃣ GRAPHS

1. **Word Ladder II**

   * Time → O(N · L²)
   * Space → O(N · L)
   * Trick → BFS + backtracking paths

2. **Critical Connections**

   * Time → **O(V+E)**
   * Space → O(V)
   * Trick → Tarjan bridge algorithm

3. **Shortest Path Visiting All Nodes**

   * Time → O(2^n · n)
   * Space → O(2^n · n)
   * Trick → Bitmask BFS

---

# 🧠 🔟 BACKTRACKING

1. **N-Queens**

   * Time → O(N!)
   * Space → O(N)
   * Trick → Column + diagonal pruning

2. **Sudoku Solver**

   * Time → Exponential
   * Space → O(1) board
   * Trick → Constraint propagation

3. **Palindrome Partitioning II**

   * Time → O(n²) DP optimized
   * Space → O(n²)
   * Trick → Precompute palindrome table

---

# 🧠 1️⃣1️⃣ DP

1. **Edit Distance**

   * Time → O(n·m)
   * Space → O(n·m) → O(min) optimized

2. **Burst Balloons**

   * Time → O(n³)
   * Space → O(n²)
   * Trick → Interval DP

3. **Job Schedule Difficulty**

   * Time → O(n²·d)
   * Space → O(n·d)

---

# 🧠 1️⃣2️⃣ GREEDY

1. **Candy**

   * Time → O(n)
   * Space → O(n) / O(1)
   * Trick → Two pass greedy

2. **Jump Game II**

   * Time → O(n)
   * Space → O(1)
   * Trick → Range expansion

3. **Refueling Stops**

   * Time → O(n log n)
   * Space → O(n)
   * Trick → Max heap fuel selection

---

# 🧠 1️⃣3️⃣ TRIE / DESIGN

1. **Word Search II**

   * Time → O(N · 4^L)
   * Space → O(N · L)

2. **Autocomplete System**

   * Time → O(L log k)
   * Space → Huge trie store

3. **Implement Trie**

   * Time → O(L) per op
   * Space → O(N · L)

---

# 🧠 1️⃣4️⃣ UNION FIND

1. **Redundant Connection II**

   * Time → O(n α(n))
   * Space → O(n)

2. **Number of Islands II**

   * Time → O(k α(n))
   * Space → O(n)

3. **Accounts Merge**

   * Time → O(n α(n))
   * Space → O(n)

α(n) = inverse Ackermann (≈ constant)

---

# 🧠 1️⃣5️⃣ BIT MANIPULATION

1. **Maximum XOR Pair**

   * Time → O(n) trie / O(n log M)
   * Space → O(n)

2. **Single Number III**

   * Time → O(n)
   * Space → O(1)

3. **Min One Bit Ops**

   * Time → O(log n)
   * Space → O(1)
   * Trick → Gray code math

---

# 📊 Hardness Ladder

| Pattern         | Hardness driver |
| --------------- | --------------- |
| O(n) but tricky | Arrays          |
| O(n log n)      | Heap / greedy   |
| O(n²)           | String / DP     |
| O(n³)           | Interval DP     |
| O(2^n)          | Backtracking    |
| O(N!)           | N-Queens        |

---

# 🧠 Interview Strategy

If interviewer gives:

* O(n²) brute → optimize to O(n log n)
* O(n log n) → optimize to O(n)
* Space O(n) → optimize to O(1)

---