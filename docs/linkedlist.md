# Java LinkedList

## Overview
`LinkedList<E>` in Java implements both `List` and `Deque` interfaces. It is a **doubly-linked list** — each node has pointers to both the previous and next node. Provides O(1) insertions/deletions at both ends, but O(n) random access.

## Key Methods

### List Operations
| Method | Description | Time |
|--------|-------------|------|
| `add(E e)` | Append to end | O(1) |
| `add(int index, E e)` | Insert at index | O(n) |
| `get(int index)` | Get by index | O(n) |
| `set(int index, E e)` | Set by index | O(n) |
| `remove(int index)` | Remove by index | O(n) |
| `remove(Object o)` | Remove first occurrence | O(n) |

### Deque Operations (use LinkedList as Stack/Queue)
| Method | Description | Time |
|--------|-------------|------|
| `addFirst(E e)` / `offerFirst(E e)` | Add to front | O(1) |
| `addLast(E e)` / `offerLast(E e)` | Add to end | O(1) |
| `getFirst()` / `peekFirst()` | View front | O(1) |
| `getLast()` / `peekLast()` | View end | O(1) |
| `removeFirst()` / `pollFirst()` | Remove from front | O(1) |
| `removeLast()` / `pollLast()` | Remove from end | O(1) |
| `push(E e)` | Push to stack (front) | O(1) |
| `pop()` | Pop from stack (front) | O(1) |

## Implementing a Linked List from Scratch

### Singly Linked List Node
```java
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
```

### Reverse a Linked List
```java
public ListNode reverse(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
```

### Detect Cycle (Floyd's Algorithm)
```java
public boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

### Find Middle Node
```java
public ListNode findMiddle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}
```

### Merge Two Sorted Lists
```java
public ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) { curr.next = l1; l1 = l1.next; }
        else { curr.next = l2; l2 = l2.next; }
        curr = curr.next;
    }
    curr.next = (l1 != null) ? l1 : l2;
    return dummy.next;
}
```

### Remove N-th Node from End
```java
public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i <= n; i++) fast = fast.next;
    while (fast != null) {
        slow = slow.next;
        fast = fast.next;
    }
    slow.next = slow.next.next;
    return dummy.next;
}
```

## When to Use
- **Use LinkedList** when: frequent insertions/deletions at both ends; implementing queues/deques.
- **Avoid LinkedList** when: random access is needed; memory is a concern (each node has overhead).
- **In competitive programming**: almost always use `ArrayList` or `ArrayDeque` instead.
