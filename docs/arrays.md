# Java Arrays

## Overview
Arrays in Java are fixed-size, contiguous blocks of memory that store elements of the same type. They provide O(1) random access by index.

## Declaration and Initialization
```java
// Declaration
int[] arr;
int arr2[];

// Initialization
int[] arr = new int[5]; // default values: 0
int[] arr = {1, 2, 3, 4, 5};
int[] arr = new int[]{1, 2, 3};

// 2D Array
int[][] matrix = new int[3][4];
int[][] matrix = {{1,2,3}, {4,5,6}, {7,8,9}};

// Jagged Array
int[][] jagged = new int[3][];
jagged[0] = new int[2];
jagged[1] = new int[4];
```

## Key Properties
- `arr.length` — returns the size (NOT a method, it's a field).
- Arrays are **objects** in Java — they extend `Object`.
- Default values: `0` for int, `0.0` for double, `false` for boolean, `null` for objects.
- Arrays are passed **by reference**.

## java.util.Arrays Utility Class

| Method | Description | Time |
|--------|-------------|------|
| `Arrays.sort(arr)` | Sort in ascending order (dual-pivot quicksort for primitives, TimSort for objects) | O(n log n) |
| `Arrays.sort(arr, from, to)` | Sort a range | O(n log n) |
| `Arrays.binarySearch(arr, key)` | Binary search on sorted array | O(log n) |
| `Arrays.fill(arr, val)` | Fill all elements with a value | O(n) |
| `Arrays.copyOf(arr, newLen)` | Copy array with new length | O(n) |
| `Arrays.copyOfRange(arr, from, to)` | Copy a range | O(n) |
| `Arrays.equals(arr1, arr2)` | Check equality | O(n) |
| `Arrays.deepEquals(arr1, arr2)` | Deep equality for multi-dim arrays | O(n) |
| `Arrays.toString(arr)` | String representation | O(n) |
| `Arrays.deepToString(arr)` | String repr for multi-dim | O(n) |
| `Arrays.stream(arr)` | Convert to IntStream/Stream | O(1) |
| `Arrays.asList(arr)` | Convert to List (only for Object arrays) | O(1) |

## Common Patterns

### Reverse an Array
```java
public void reverse(int[] arr) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int temp = arr[left];
        arr[left++] = arr[right];
        arr[right--] = temp;
    }
}
```

### Find Maximum
```java
int max = Arrays.stream(arr).max().getAsInt();
// Or manually:
int max = arr[0];
for (int num : arr) max = Math.max(max, num);
```

### Kadane's Algorithm (Maximum Subarray Sum)
```java
public int maxSubArray(int[] nums) {
    int maxSum = nums[0], currentSum = nums[0];
    for (int i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}
```

### Dutch National Flag (Sort 0s, 1s, 2s)
```java
public void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] == 0) swap(nums, low++, mid++);
        else if (nums[mid] == 1) mid++;
        else swap(nums, mid, high--);
    }
}
```

### Prefix Sum Array
```java
int[] prefix = new int[n + 1];
for (int i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
}
// Sum of range [l, r] = prefix[r+1] - prefix[l]
```

### Convert Array to List and Back
```java
// Primitive array to List
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());

// List to array
int[] arr = list.stream().mapToInt(Integer::intValue).toArray();

// Object array to List
List<String> list = Arrays.asList(strArr);
List<String> list = new ArrayList<>(Arrays.asList(strArr)); // modifiable
```

## Tips for Competitive Programming
1. Use `int[]` instead of `ArrayList<Integer>` for performance.
2. `Arrays.sort()` on primitives uses dual-pivot quicksort — O(n²) worst case. For anti-hack protection, shuffle before sorting.
3. For 2D arrays, access `matrix[row][col]` — row-major is cache-friendly.
4. Use `System.arraycopy(src, srcPos, dest, destPos, length)` for fast copying.
