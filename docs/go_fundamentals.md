# Go Fundamentals

## Slices
```go
// Creation
s := make([]int, 5)         // len=5, cap=5
s := make([]int, 0, 10)     // len=0, cap=10
s := []int{1, 2, 3}

// Operations
s = append(s, 4, 5)         // O(1) amortized
copy(dst, src)               // copy elements
s[1:3]                       // slice [1,3)
s[:0]                        // clear keeping capacity

// Sort
sort.Ints(s)
sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })

// Binary search
idx := sort.SearchInts(s, target)
```

## Maps
```go
// Creation & operations
m := make(map[string]int)
m["key"] = 42
val, ok := m["key"]         // comma ok idiom
delete(m, "key")

// Iteration (random order)
for k, v := range m { }

// Set pattern
seen := make(map[int]bool)
seen[x] = true
if seen[x] { /* exists */ }

// Frequency count
freq := make(map[rune]int)
for _, c := range s {
    freq[c]++
}
```

## Goroutines & Channels
```go
// Basic goroutine
go func() {
    // concurrent work
}()

// Channels
ch := make(chan int)         // unbuffered
ch := make(chan int, 100)    // buffered

ch <- 42                     // send
val := <-ch                  // receive

// Select
select {
case msg := <-ch1:
    // handle ch1
case ch2 <- val:
    // send to ch2
case <-time.After(5 * time.Second):
    // timeout
default:
    // non-blocking
}

// Fan-out / Fan-in
func fanOut(input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        channels[i] = worker(input)
    }
    return channels
}

func merge(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    merged := make(chan int)
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c { merged <- v }
        }(ch)
    }
    go func() { wg.Wait(); close(merged) }()
    return merged
}
```

## Interfaces
```go
// Interface definition
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Empty interface (any)
var x interface{} = 42
var x any = 42  // Go 1.18+

// Type assertion
s, ok := x.(string)

// Type switch
switch v := x.(type) {
case int:
    fmt.Println("int:", v)
case string:
    fmt.Println("string:", v)
default:
    fmt.Println("unknown")
}

// Stringer interface
func (t MyType) String() string { return fmt.Sprintf("...") }
```

## Error Handling
```go
// Custom errors
type AppError struct {
    Code    int
    Message string
}

func (e *AppError) Error() string { return e.Message }

// Wrapping errors (Go 1.13+)
if err != nil {
    return fmt.Errorf("failed to process: %w", err)
}

// Checking wrapped errors
if errors.Is(err, os.ErrNotExist) { /* handle */ }
var appErr *AppError
if errors.As(err, &appErr) { /* access appErr.Code */ }

// Defer for cleanup
func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil { return nil, err }
    defer f.Close()
    return io.ReadAll(f)
}
```

## Generics (Go 1.18+)
```go
// Generic function
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

// Generic constraints
type Number interface {
    ~int | ~int32 | ~int64 | ~float32 | ~float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums { total += n }
    return total
}
```

## Sync Primitives
```go
// Mutex
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()

// RWMutex
var rwmu sync.RWMutex
rwmu.RLock()    // multiple readers OK
rwmu.RUnlock()
rwmu.Lock()     // exclusive writer

// WaitGroup
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        // work
    }(i)
}
wg.Wait()

// Once
var once sync.Once
once.Do(func() { /* init */ })
```

## Common DSA Patterns

### Two Pointers
```go
func twoSum(nums []int, target int) (int, int) {
    l, r := 0, len(nums)-1
    for l < r {
        sum := nums[l] + nums[r]
        switch {
        case sum == target: return l, r
        case sum < target: l++
        default: r--
        }
    }
    return -1, -1
}
```

### BFS
```go
func bfs(graph map[int][]int, start int) []int {
    visited := map[int]bool{start: true}
    queue := []int{start}
    var result []int
    
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        result = append(result, node)
        for _, next := range graph[node] {
            if !visited[next] {
                visited[next] = true
                queue = append(queue, next)
            }
        }
    }
    return result
}
```

### Stack
```go
// Stack using slice
stack := []int{}
stack = append(stack, x)            // push
top := stack[len(stack)-1]          // peek
stack = stack[:len(stack)-1]        // pop
```

## Context
```go
// Timeout context
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// Cancellation
ctx, cancel := context.WithCancel(context.Background())
go func() {
    <-ctx.Done()
    // cleanup
}()
cancel() // signal cancellation

// Pass values
ctx = context.WithValue(ctx, "userID", 42)
userID := ctx.Value("userID").(int)
```
