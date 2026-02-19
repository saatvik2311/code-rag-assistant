# Java Trees

## Overview
Trees are hierarchical data structures. Binary trees have at most 2 children per node. Binary Search Trees (BST) maintain the property: left < root < right.

## TreeNode Definition
```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val; this.left = left; this.right = right;
    }
}
```

## Tree Traversals

### Inorder (Left → Root → Right) — gives sorted order for BST
```java
// Recursive
public void inorder(TreeNode root) {
    if (root == null) return;
    inorder(root.left);
    System.out.print(root.val + " ");
    inorder(root.right);
}

// Iterative
public List<Integer> inorderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Stack<TreeNode> stack = new Stack<>();
    TreeNode curr = root;
    while (curr != null || !stack.isEmpty()) {
        while (curr != null) { stack.push(curr); curr = curr.left; }
        curr = stack.pop();
        result.add(curr.val);
        curr = curr.right;
    }
    return result;
}
```

### Preorder (Root → Left → Right)
```java
public void preorder(TreeNode root) {
    if (root == null) return;
    System.out.print(root.val + " ");
    preorder(root.left);
    preorder(root.right);
}
```

### Postorder (Left → Right → Root)
```java
public void postorder(TreeNode root) {
    if (root == null) return;
    postorder(root.left);
    postorder(root.right);
    System.out.print(root.val + " ");
}
```

### Level Order (BFS)
```java
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

## Common Tree Problems

### Maximum Depth
```java
public int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

### Check if Balanced
```java
public boolean isBalanced(TreeNode root) {
    return height(root) != -1;
}
private int height(TreeNode root) {
    if (root == null) return 0;
    int left = height(root.left), right = height(root.right);
    if (left == -1 || right == -1 || Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
}
```

### Validate BST
```java
public boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}
private boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left, min, node.val) && validate(node.right, node.val, max);
}
```

### Lowest Common Ancestor (LCA)
```java
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    if (left != null && right != null) return root;
    return left != null ? left : right;
}
```

### Path Sum
```java
public boolean hasPathSum(TreeNode root, int targetSum) {
    if (root == null) return false;
    if (root.left == null && root.right == null) return root.val == targetSum;
    return hasPathSum(root.left, targetSum - root.val) ||
           hasPathSum(root.right, targetSum - root.val);
}
```

## Java TreeMap and TreeSet

### TreeMap<K, V>
Red-black tree implementation. Keys are sorted.

| Method | Description | Time |
|--------|-------------|------|
| `put(K, V)` | Insert/update | O(log n) |
| `get(K)` | Retrieve by key | O(log n) |
| `firstKey()` / `lastKey()` | Min/Max key | O(log n) |
| `floorKey(K)` | Greatest key ≤ K | O(log n) |
| `ceilingKey(K)` | Smallest key ≥ K | O(log n) |
| `lowerKey(K)` | Greatest key < K | O(log n) |
| `higherKey(K)` | Smallest key > K | O(log n) |
| `subMap(from, to)` | View of range | O(log n) |

### TreeSet<E>
Sorted set backed by TreeMap.

```java
TreeSet<Integer> set = new TreeSet<>();
set.add(5); set.add(3); set.add(7);
set.first();       // 3
set.last();        // 7
set.floor(4);      // 3 (greatest ≤ 4)
set.ceiling(4);    // 5 (smallest ≥ 4)
set.lower(5);      // 3 (greatest < 5)
set.higher(5);     // 7 (smallest > 5)
```

## Tips
1. Most tree problems are solved with recursion — think in terms of subproblems.
2. For BST problems, use the sorted property (inorder gives sorted sequence).
3. `TreeMap`/`TreeSet` are great for problems needing sorted data with O(log n) operations.
4. Use `TreeMap.floorKey()` and `ceilingKey()` for nearest-neighbor queries.
