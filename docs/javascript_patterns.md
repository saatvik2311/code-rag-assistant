# JavaScript & TypeScript Patterns

## Arrays
```javascript
// Creation & transformation
const arr = Array.from({ length: 5 }, (_, i) => i); // [0,1,2,3,4]
const matrix = Array.from({ length: 3 }, () => Array(3).fill(0));

// Destructuring
const [first, ...rest] = arr;
const [a, , b] = [1, 2, 3]; // a=1, b=3

// Functional methods
arr.map(x => x * 2)           // transform
arr.filter(x => x > 0)        // filter
arr.reduce((acc, x) => acc + x, 0)  // reduce
arr.find(x => x > 3)          // first match
arr.findIndex(x => x > 3)     // first match index
arr.some(x => x > 3)          // any match?
arr.every(x => x > 0)         // all match?
arr.flat(Infinity)             // flatten nested
arr.flatMap(x => [x, x*2])    // map + flatten

// Sorting
arr.sort((a, b) => a - b)              // numeric ascending
arr.sort((a, b) => a.localeCompare(b)) // string
```

## Map & Set
```javascript
// Map (ordered, any key type)
const map = new Map();
map.set(key, value);
map.get(key);
map.has(key);
map.delete(key);
map.size;
for (const [k, v] of map) { }

// Set
const set = new Set([1, 2, 3]);
set.add(4);
set.has(2);
set.delete(1);
[...new Set(arr)]; // deduplicate
```

## Objects & Destructuring
```javascript
// Object spread
const merged = { ...obj1, ...obj2 };

// Computed properties
const key = 'name';
const obj = { [key]: 'John' };

// Optional chaining & nullish coalescing
const val = obj?.nested?.deep ?? 'default';

// Object.entries / Object.fromEntries
const pairs = Object.entries(obj); // [[k,v], ...]
const obj2 = Object.fromEntries(pairs);
```

## Async Patterns
```javascript
// Promise.all (parallel)
const results = await Promise.all([fetchA(), fetchB(), fetchC()]);

// Promise.allSettled (all complete, no short-circuit)
const results = await Promise.allSettled(promises);

// Promise.race (first to resolve/reject)
const fastest = await Promise.race([fetch1(), timeout(5000)]);

// Async iteration
for await (const chunk of stream) { process(chunk); }

// Sequential async
for (const item of items) {
    await processItem(item);
}
```

## Closures & Scope
```javascript
// Closure for data privacy
function createCounter() {
    let count = 0;
    return {
        increment: () => ++count,
        decrement: () => --count,
        getCount: () => count
    };
}

// IIFE
const module = (() => {
    const private = 'hidden';
    return { public: () => private };
})();
```

## Event Loop & Microtasks
```javascript
// Execution order: sync → microtasks → macrotasks
console.log('1');                    // sync
setTimeout(() => console.log('2'), 0);  // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// Output: 1, 4, 3, 2

// queueMicrotask
queueMicrotask(() => { /* runs before next macrotask */ });
```

## Prototype & Classes
```javascript
class LinkedList {
    constructor() { this.head = null; this.size = 0; }
    
    prepend(val) {
        this.head = { val, next: this.head };
        this.size++;
    }
    
    *[Symbol.iterator]() {
        let node = this.head;
        while (node) { yield node.val; node = node.next; }
    }
}
```

## Error Handling
```javascript
// Custom errors
class AppError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'AppError';
    }
}

// Async error handling
async function safeFetch(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new AppError(`HTTP ${res.status}`, res.status);
        return await res.json();
    } catch (err) {
        if (err instanceof AppError) { /* handle */ }
        throw err; // re-throw unknown
    }
}
```

## Common DSA Patterns in JS

### Two Pointers
```javascript
function twoSum(arr, target) {
    let l = 0, r = arr.length - 1;
    while (l < r) {
        const sum = arr[l] + arr[r];
        if (sum === target) return [l, r];
        sum < target ? l++ : r--;
    }
    return [-1, -1];
}
```

### Sliding Window
```javascript
function maxSumSubarray(arr, k) {
    let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
    let maxSum = windowSum;
    for (let i = k; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}
```

### BFS
```javascript
function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
        const node = queue.shift();
        for (const neighbor of graph[node] ?? []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return visited;
}
```

## TypeScript Essentials
```typescript
// Generics
function identity<T>(arg: T): T { return arg; }

// Utility types
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type Record<K extends keyof any, T> = { [P in K]: T };

// Discriminated unions
type Shape =
    | { kind: 'circle'; radius: number }
    | { kind: 'rect'; width: number; height: number };

function area(shape: Shape): number {
    switch (shape.kind) {
        case 'circle': return Math.PI * shape.radius ** 2;
        case 'rect': return shape.width * shape.height;
    }
}
```

## Node.js Patterns
```javascript
// Streams
const { pipeline } = require('stream/promises');
await pipeline(
    fs.createReadStream('input.txt'),
    transform,
    fs.createWriteStream('output.txt')
);

// EventEmitter
const { EventEmitter } = require('events');
class MyService extends EventEmitter {
    process(data) {
        this.emit('progress', 50);
        // ...
        this.emit('done', result);
    }
}

// Worker threads
const { Worker, isMainThread, parentPort } = require('worker_threads');
```
