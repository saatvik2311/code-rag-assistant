# Java Strings

## Overview
Strings in Java are **immutable** objects. Once created, their content cannot be changed — any modification creates a new String object. This is important for performance and memory management.

## String, StringBuilder, StringBuffer

| Feature | String | StringBuilder | StringBuffer |
|---------|--------|---------------|--------------|
| Mutability | Immutable | Mutable | Mutable |
| Thread-safe | Yes (immutable) | No | Yes (synchronized) |
| Performance | Slow for concat | Fast | Slower than StringBuilder |
| Use case | General | String building in loops | Multi-threaded string building |

## Essential String Methods

| Method | Description | Time |
|--------|-------------|------|
| `charAt(int i)` | Character at index | O(1) |
| `length()` | String length | O(1) |
| `substring(int begin)` | Substring from index | O(n) |
| `substring(int begin, int end)` | Substring [begin, end) | O(n) |
| `indexOf(String str)` | First occurrence index | O(n*m) |
| `lastIndexOf(String str)` | Last occurrence index | O(n*m) |
| `contains(CharSequence s)` | Check if contains | O(n*m) |
| `startsWith(String prefix)` | Check prefix | O(m) |
| `endsWith(String suffix)` | Check suffix | O(m) |
| `equals(Object o)` | Content equality | O(n) |
| `equalsIgnoreCase(String s)` | Case-insensitive equals | O(n) |
| `compareTo(String s)` | Lexicographic comparison | O(n) |
| `toCharArray()` | Convert to char[] | O(n) |
| `toLowerCase()` / `toUpperCase()` | Case conversion | O(n) |
| `trim()` / `strip()` | Remove whitespace | O(n) |
| `split(String regex)` | Split by regex | O(n) |
| `replace(char old, char new)` | Replace all occurrences | O(n) |
| `replaceAll(String regex, String rep)` | Regex replace | O(n) |
| `join(delimiter, elements)` | Join strings | O(n) |
| `valueOf(x)` | Convert to String | O(1) |
| `isEmpty()` / `isBlank()` | Check empty/blank | O(1)/O(n) |

## Common Patterns

### String to char array and back
```java
char[] chars = str.toCharArray();
String str = new String(chars);
String str = String.valueOf(chars);
```

### Reverse a String
```java
String reversed = new StringBuilder(str).reverse().toString();
```

### Check Palindrome
```java
public boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left++) != s.charAt(right--)) return false;
    }
    return true;
}
```

### Character Frequency
```java
int[] freq = new int[26];
for (char c : str.toCharArray()) {
    freq[c - 'a']++;
}
```

### Build String Efficiently
```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) {
    sb.append("word").append(i).append(" ");
}
String result = sb.toString();
```

### String to Integer and Back
```java
int num = Integer.parseInt("123");
String str = String.valueOf(123);
String str = Integer.toString(123);
```

### Check if Two Strings are Anagrams
```java
public boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[26];
    for (int i = 0; i < s.length(); i++) {
        count[s.charAt(i) - 'a']++;
        count[t.charAt(i) - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}
```

### Longest Common Substring
```java
// Using DP
public int longestCommonSubstring(String s1, String s2) {
    int m = s1.length(), n = s2.length(), max = 0;
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i-1) == s2.charAt(j-1)) {
                dp[i][j] = dp[i-1][j-1] + 1;
                max = Math.max(max, dp[i][j]);
            }
        }
    }
    return max;
}
```

## Tips
1. **NEVER** concatenate strings in a loop with `+` — use `StringBuilder`.
2. Use `==` for reference equality, `.equals()` for content equality.
3. `String.intern()` returns a canonical representation from the string pool.
4. For competitive programming, prefer `char[]` operations over `String` for speed.
5. `str.chars()` returns an `IntStream` — use `mapToObj(c -> (char) c)` for Character stream.
