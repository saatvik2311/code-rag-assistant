# Java Sorting

## Overview
Java provides multiple ways to sort arrays and collections. Understanding sorting is essential for competitive programming and interviews.

## Arrays.sort()
- **Primitives**: Uses **dual-pivot quicksort** — O(n log n) average, O(n²) worst case.
- **Objects**: Uses **TimSort** (merge sort + insertion sort hybrid) — O(n log n) guaranteed, stable.

```java
int[] arr = {5, 3, 1, 4, 2};
Arrays.sort(arr);                    // ascending: [1, 2, 3, 4, 5]
Arrays.sort(arr, 1, 4);             // sort range [1, 4): [5, 1, 3, 4, 2]

Integer[] arr2 = {5, 3, 1, 4, 2};
Arrays.sort(arr2, Collections.reverseOrder()); // descending
```

## Collections.sort()
Uses **TimSort** — O(n log n), stable.

```java
List<Integer> list = Arrays.asList(5, 3, 1, 4, 2);
Collections.sort(list);                           // ascending
Collections.sort(list, Collections.reverseOrder()); // descending
list.sort(Comparator.naturalOrder());              // Java 8+ alternative
```

## Comparable Interface
Define natural ordering for a class.

```java
class Student implements Comparable<Student> {
    String name;
    int grade;
    
    @Override
    public int compareTo(Student other) {
        return Integer.compare(this.grade, other.grade); // sort by grade ascending
    }
}

List<Student> students = ...;
Collections.sort(students); // uses compareTo
```

## Comparator Interface
Define custom orderings without modifying the class.

```java
// Lambda (Java 8+)
list.sort((a, b) -> a.getName().compareTo(b.getName()));

// Method reference
list.sort(Comparator.comparing(Student::getGrade));

// Chained comparators
list.sort(Comparator.comparing(Student::getGrade)
                    .thenComparing(Student::getName)
                    .reversed());

// Comparator utilities
Comparator.naturalOrder()
Comparator.reverseOrder()
Comparator.comparingInt(Student::getGrade)
Comparator.comparingDouble(Student::getGpa)
Comparator.nullsFirst(Comparator.naturalOrder())
Comparator.nullsLast(Comparator.naturalOrder())
```

## Sorting Algorithms Implementation

### Merge Sort (Stable, O(n log n))
```java
public void mergeSort(int[] arr, int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

private void merge(int[] arr, int left, int mid, int right) {
    int[] temp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0;
    while (i <= mid && j <= right) {
        temp[k++] = (arr[i] <= arr[j]) ? arr[i++] : arr[j++];
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];
    System.arraycopy(temp, 0, arr, left, temp.length);
}
```

### Quick Sort (O(n log n) avg)
```java
public void quickSort(int[] arr, int low, int high) {
    if (low >= high) return;
    int pivot = partition(arr, low, high);
    quickSort(arr, low, pivot - 1);
    quickSort(arr, pivot + 1, high);
}

private int partition(int[] arr, int low, int high) {
    int pivot = arr[high], i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            int temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        }
    }
    int temp = arr[i+1]; arr[i+1] = arr[high]; arr[high] = temp;
    return i + 1;
}
```

### Counting Sort (O(n + k))
```java
public void countingSort(int[] arr) {
    int max = Arrays.stream(arr).max().getAsInt();
    int[] count = new int[max + 1];
    for (int num : arr) count[num]++;
    int idx = 0;
    for (int i = 0; i <= max; i++) {
        while (count[i]-- > 0) arr[idx++] = i;
    }
}
```

## Sorting 2D Arrays
```java
int[][] intervals = {{1,3}, {2,6}, {8,10}};

// Sort by first element
Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));

// Sort by second element, then first
Arrays.sort(intervals, (a, b) -> a[1] != b[1] ? a[1] - b[1] : a[0] - b[0]);
```

## Tips
1. Use `Integer[]` (not `int[]`) for custom comparators with `Arrays.sort`.
2. TimSort is stable — equal elements maintain their relative order.
3. For competitive programming: shuffle array before quicksort to avoid O(n²) worst case.
4. `Collections.sort()` and `list.sort()` are equivalent — use `list.sort()` for cleaner code.
