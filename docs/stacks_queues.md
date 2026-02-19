# Java Stacks and Queues

## Stack

### Using java.util.Stack (legacy, use Deque instead)
```java
Stack<Integer> stack = new Stack<>();
stack.push(1);
stack.peek();    // top element without removing
stack.pop();     // remove and return top
stack.isEmpty();
stack.size();
```

### Preferred: ArrayDeque as Stack
```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);    // pushes to front
stack.peek();     // views front
stack.pop();      // removes from front
stack.isEmpty();
```

### Common Stack Patterns

#### Valid Parentheses
```java
public boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(') stack.push(')');
        else if (c == '[') stack.push(']');
        else if (c == '{') stack.push('}');
        else if (stack.isEmpty() || stack.pop() != c) return false;
    }
    return stack.isEmpty();
}
```

#### Monotonic Stack (Next Greater Element)
```java
public int[] nextGreaterElement(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // stores indices
    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
            result[stack.pop()] = arr[i];
        }
        stack.push(i);
    }
    return result;
}
```

#### Min Stack
```java
class MinStack {
    Deque<int[]> stack = new ArrayDeque<>(); // [value, currentMin]
    
    public void push(int val) {
        int min = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[]{val, min});
    }
    public void pop() { stack.pop(); }
    public int top() { return stack.peek()[0]; }
    public int getMin() { return stack.peek()[1]; }
}
```

#### Evaluate Reverse Polish Notation
```java
public int evalRPN(String[] tokens) {
    Deque<Integer> stack = new ArrayDeque<>();
    for (String token : tokens) {
        if ("+-*/".contains(token)) {
            int b = stack.pop(), a = stack.pop();
            switch (token) {
                case "+": stack.push(a + b); break;
                case "-": stack.push(a - b); break;
                case "*": stack.push(a * b); break;
                case "/": stack.push(a / b); break;
            }
        } else {
            stack.push(Integer.parseInt(token));
        }
    }
    return stack.pop();
}
```

## Queue

### Using LinkedList as Queue
```java
Queue<Integer> queue = new LinkedList<>();
queue.offer(1);   // enqueue (returns false if full, vs add which throws)
queue.peek();     // view front
queue.poll();     // dequeue (returns null if empty, vs remove which throws)
queue.isEmpty();
```

### Preferred: ArrayDeque as Queue
```java
Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1);   // add to back
queue.peek();     // view front
queue.poll();     // remove from front
```

## PriorityQueue (Min-Heap by default)

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());

minHeap.offer(5);
minHeap.offer(1);
minHeap.offer(3);
minHeap.peek();    // 1 (smallest)
minHeap.poll();    // removes and returns 1

// Custom comparator
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
```

### Top K Elements
```java
public int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);
    
    PriorityQueue<Map.Entry<Integer, Integer>> pq = 
        new PriorityQueue<>((a, b) -> b.getValue() - a.getValue());
    pq.addAll(freq.entrySet());
    
    int[] result = new int[k];
    for (int i = 0; i < k; i++) result[i] = pq.poll().getKey();
    return result;
}
```

### Merge K Sorted Lists
```java
public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
    for (ListNode head : lists) if (head != null) pq.offer(head);
    
    ListNode dummy = new ListNode(0), curr = dummy;
    while (!pq.isEmpty()) {
        ListNode node = pq.poll();
        curr.next = node;
        curr = curr.next;
        if (node.next != null) pq.offer(node.next);
    }
    return dummy.next;
}
```

## Deque (Double-Ended Queue)

```java
Deque<Integer> deque = new ArrayDeque<>();
deque.offerFirst(1);  // add to front
deque.offerLast(2);   // add to back
deque.peekFirst();    // view front
deque.peekLast();     // view back
deque.pollFirst();    // remove from front
deque.pollLast();     // remove from back
```

### Sliding Window Maximum
```java
public int[] maxSlidingWindow(int[] nums, int k) {
    Deque<Integer> deque = new ArrayDeque<>(); // stores indices
    int[] result = new int[nums.length - k + 1];
    for (int i = 0; i < nums.length; i++) {
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) deque.pollFirst();
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) deque.pollLast();
        deque.offerLast(i);
        if (i >= k - 1) result[i - k + 1] = nums[deque.peekFirst()];
    }
    return result;
}
```

## Tips
1. Use `ArrayDeque` instead of `Stack` or `LinkedList` — faster and less memory.
2. `PriorityQueue` is NOT sorted — it only guarantees the head is the min/max element.
3. For a fixed-size heap (top K), use a min-heap of size K and evict when size > K.
