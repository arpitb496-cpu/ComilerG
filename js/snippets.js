/**
 * CompilerG - DSA & Algorithm Snippets Library
 * Categorized code templates for competitive programming & interview prep.
 * Language-aware: provides idiomatic templates for the active language.
 */

window.SNIPPETS = {
    categories: [
        {
            name: 'Fast I/O',
            icon: '⚡',
            snippets: {
                python: `import sys\ninput = sys.stdin.readline\n\ndef main():\n    n = int(input())\n    arr = list(map(int, input().split()))\n    print(n, arr)\n\nmain()`,
                cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    int n;\n    cin >> n;\n    vector<int> arr(n);\n    for (int i = 0; i < n; i++) cin >> arr[i];\n    \n    cout << n << endl;\n    return 0;\n}`,
                java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        int n = Integer.parseInt(br.readLine().trim());\n        StringTokenizer st = new StringTokenizer(br.readLine());\n        int[] arr = new int[n];\n        for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());\n        System.out.println(n);\n    }\n}`,
                javascript: `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n    const n = parseInt(lines[0]);\n    const arr = lines[1].split(' ').map(Number);\n    console.log(n, arr);\n});`,
                c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    int arr[n];\n    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);\n    printf("%d\\n", n);\n    return 0;\n}`
            }
        },
        {
            name: 'Binary Search',
            icon: '🔍',
            snippets: {
                python: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1  # Not found\n\n# Lower bound (first index >= target)\ndef lower_bound(arr, target):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo`,
                cpp: `// Binary Search (Iterative)\nint binarySearch(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size() - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}\n\n// Lower bound: first index >= target\nint lowerBound(vector<int>& arr, int target) {\n    int lo = 0, hi = arr.size();\n    while (lo < hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] < target) lo = mid + 1;\n        else hi = mid;\n    }\n    return lo;\n}`,
                java: `static int binarySearch(int[] arr, int target) {\n    int lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}`,
                javascript: `function binarySearch(arr, target) {\n    let lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        const mid = Math.floor((lo + hi) / 2);\n        if (arr[mid] === target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}`,
                c: `int binarySearch(int arr[], int n, int target) {\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}`
            }
        },
        {
            name: 'Two Pointers',
            icon: '👆',
            snippets: {
                python: `def two_sum_sorted(arr, target):\n    \"\"\"Find two numbers in sorted array that sum to target.\"\"\"\n    left, right = 0, len(arr) - 1\n    while left < right:\n        curr_sum = arr[left] + arr[right]\n        if curr_sum == target:\n            return [left, right]\n        elif curr_sum < target:\n            left += 1\n        else:\n            right -= 1\n    return [-1, -1]`,
                cpp: `// Two Sum in sorted array\npair<int,int> twoSumSorted(vector<int>& arr, int target) {\n    int left = 0, right = arr.size() - 1;\n    while (left < right) {\n        int sum = arr[left] + arr[right];\n        if (sum == target) return {left, right};\n        else if (sum < target) left++;\n        else right--;\n    }\n    return {-1, -1};\n}`,
                java: `static int[] twoSumSorted(int[] arr, int target) {\n    int left = 0, right = arr.length - 1;\n    while (left < right) {\n        int sum = arr[left] + arr[right];\n        if (sum == target) return new int[]{left, right};\n        else if (sum < target) left++;\n        else right--;\n    }\n    return new int[]{-1, -1};\n}`,
                javascript: `function twoSumSorted(arr, target) {\n    let left = 0, right = arr.length - 1;\n    while (left < right) {\n        const sum = arr[left] + arr[right];\n        if (sum === target) return [left, right];\n        else if (sum < target) left++;\n        else right--;\n    }\n    return [-1, -1];\n}`,
                c: `void twoSumSorted(int arr[], int n, int target, int* res) {\n    int left = 0, right = n - 1;\n    while (left < right) {\n        int sum = arr[left] + arr[right];\n        if (sum == target) { res[0] = left; res[1] = right; return; }\n        else if (sum < target) left++;\n        else right--;\n    }\n    res[0] = -1; res[1] = -1;\n}`
            }
        },
        {
            name: 'Sliding Window',
            icon: '🪟',
            snippets: {
                python: `def max_sum_subarray(arr, k):\n    \"\"\"Maximum sum of subarray of size k.\"\"\"\n    n = len(arr)\n    if n < k:\n        return -1\n    window_sum = sum(arr[:k])\n    max_sum = window_sum\n    for i in range(k, n):\n        window_sum += arr[i] - arr[i - k]\n        max_sum = max(max_sum, window_sum)\n    return max_sum`,
                cpp: `int maxSumSubarray(vector<int>& arr, int k) {\n    int n = arr.size();\n    if (n < k) return -1;\n    int windowSum = 0;\n    for (int i = 0; i < k; i++) windowSum += arr[i];\n    int maxSum = windowSum;\n    for (int i = k; i < n; i++) {\n        windowSum += arr[i] - arr[i - k];\n        maxSum = max(maxSum, windowSum);\n    }\n    return maxSum;\n}`,
                java: `static int maxSumSubarray(int[] arr, int k) {\n    int n = arr.length;\n    if (n < k) return -1;\n    int windowSum = 0;\n    for (int i = 0; i < k; i++) windowSum += arr[i];\n    int maxSum = windowSum;\n    for (int i = k; i < n; i++) {\n        windowSum += arr[i] - arr[i - k];\n        maxSum = Math.max(maxSum, windowSum);\n    }\n    return maxSum;\n}`,
                javascript: `function maxSumSubarray(arr, k) {\n    if (arr.length < k) return -1;\n    let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);\n    let maxSum = windowSum;\n    for (let i = k; i < arr.length; i++) {\n        windowSum += arr[i] - arr[i - k];\n        maxSum = Math.max(maxSum, windowSum);\n    }\n    return maxSum;\n}`,
                c: `int maxSumSubarray(int arr[], int n, int k) {\n    if (n < k) return -1;\n    int windowSum = 0;\n    for (int i = 0; i < k; i++) windowSum += arr[i];\n    int maxSum = windowSum;\n    for (int i = k; i < n; i++) {\n        windowSum += arr[i] - arr[i - k];\n        if (windowSum > maxSum) maxSum = windowSum;\n    }\n    return maxSum;\n}`
            }
        },
        {
            name: 'BFS (Graph)',
            icon: '🌐',
            snippets: {
                python: `from collections import deque\n\ndef bfs(graph, start):\n    \"\"\"BFS traversal on adjacency list graph.\"\"\"\n    visited = set([start])\n    queue = deque([start])\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\n# Example:\n# graph = {0: [1,2], 1: [0,3], 2: [0], 3: [1]}\n# print(bfs(graph, 0))`,
                cpp: `void bfs(vector<vector<int>>& graph, int start) {\n    int n = graph.size();\n    vector<bool> visited(n, false);\n    queue<int> q;\n    visited[start] = true;\n    q.push(start);\n    while (!q.empty()) {\n        int node = q.front(); q.pop();\n        cout << node << " ";\n        for (int neighbor : graph[node]) {\n            if (!visited[neighbor]) {\n                visited[neighbor] = true;\n                q.push(neighbor);\n            }\n        }\n    }\n}`,
                java: `static void bfs(List<List<Integer>> graph, int start) {\n    boolean[] visited = new boolean[graph.size()];\n    Queue<Integer> queue = new LinkedList<>();\n    visited[start] = true;\n    queue.add(start);\n    while (!queue.isEmpty()) {\n        int node = queue.poll();\n        System.out.print(node + " ");\n        for (int neighbor : graph.get(node)) {\n            if (!visited[neighbor]) {\n                visited[neighbor] = true;\n                queue.add(neighbor);\n            }\n        }\n    }\n}`,
                javascript: `function bfs(graph, start) {\n    const visited = new Set([start]);\n    const queue = [start];\n    const order = [];\n    while (queue.length > 0) {\n        const node = queue.shift();\n        order.push(node);\n        for (const neighbor of graph[node]) {\n            if (!visited.has(neighbor)) {\n                visited.add(neighbor);\n                queue.push(neighbor);\n            }\n        }\n    }\n    return order;\n}`,
                c: `void bfs(int graph[][100], int edges[], int n, int start) {\n    int visited[100] = {0};\n    int queue[100], front = 0, rear = 0;\n    visited[start] = 1;\n    queue[rear++] = start;\n    while (front < rear) {\n        int node = queue[front++];\n        printf("%d ", node);\n        for (int i = 0; i < edges[node]; i++) {\n            int nb = graph[node][i];\n            if (!visited[nb]) {\n                visited[nb] = 1;\n                queue[rear++] = nb;\n            }\n        }\n    }\n}`
            }
        },
        {
            name: 'DFS (Graph)',
            icon: '🔬',
            snippets: {
                python: `def dfs(graph, start):\n    \"\"\"DFS traversal on adjacency list graph.\"\"\"\n    visited = set()\n    order = []\n    def _dfs(node):\n        visited.add(node)\n        order.append(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                _dfs(neighbor)\n    _dfs(start)\n    return order`,
                cpp: `void dfs(vector<vector<int>>& graph, int node, vector<bool>& visited) {\n    visited[node] = true;\n    cout << node << " ";\n    for (int neighbor : graph[node]) {\n        if (!visited[neighbor]) {\n            dfs(graph, neighbor, visited);\n        }\n    }\n}`,
                java: `static void dfs(List<List<Integer>> graph, int node, boolean[] visited) {\n    visited[node] = true;\n    System.out.print(node + " ");\n    for (int neighbor : graph.get(node)) {\n        if (!visited[neighbor]) {\n            dfs(graph, neighbor, visited);\n        }\n    }\n}`,
                javascript: `function dfs(graph, start) {\n    const visited = new Set();\n    const order = [];\n    function _dfs(node) {\n        visited.add(node);\n        order.push(node);\n        for (const neighbor of graph[node]) {\n            if (!visited.has(neighbor)) _dfs(neighbor);\n        }\n    }\n    _dfs(start);\n    return order;\n}`,
                c: `void dfs(int graph[][100], int edges[], int node, int visited[]) {\n    visited[node] = 1;\n    printf("%d ", node);\n    for (int i = 0; i < edges[node]; i++) {\n        int nb = graph[node][i];\n        if (!visited[nb]) dfs(graph, edges, nb, visited);\n    }\n}`
            }
        },
        {
            name: 'Merge Sort',
            icon: '🔀',
            snippets: {
                python: `def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i]); i += 1\n        else:\n            result.append(right[j]); j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result`,
                cpp: `void merge(vector<int>& arr, int l, int m, int r) {\n    vector<int> L(arr.begin()+l, arr.begin()+m+1);\n    vector<int> R(arr.begin()+m+1, arr.begin()+r+1);\n    int i = 0, j = 0, k = l;\n    while (i < L.size() && j < R.size())\n        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];\n    while (i < L.size()) arr[k++] = L[i++];\n    while (j < R.size()) arr[k++] = R[j++];\n}\n\nvoid mergeSort(vector<int>& arr, int l, int r) {\n    if (l >= r) return;\n    int m = l + (r - l) / 2;\n    mergeSort(arr, l, m);\n    mergeSort(arr, m + 1, r);\n    merge(arr, l, m, r);\n}`,
                java: `static void mergeSort(int[] arr, int l, int r) {\n    if (l >= r) return;\n    int m = l + (r - l) / 2;\n    mergeSort(arr, l, m);\n    mergeSort(arr, m + 1, r);\n    int[] L = Arrays.copyOfRange(arr, l, m + 1);\n    int[] R = Arrays.copyOfRange(arr, m + 1, r + 1);\n    int i = 0, j = 0, k = l;\n    while (i < L.length && j < R.length)\n        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];\n    while (i < L.length) arr[k++] = L[i++];\n    while (j < R.length) arr[k++] = R[j++];\n}`,
                javascript: `function mergeSort(arr) {\n    if (arr.length <= 1) return arr;\n    const mid = Math.floor(arr.length / 2);\n    const left = mergeSort(arr.slice(0, mid));\n    const right = mergeSort(arr.slice(mid));\n    const result = [];\n    let i = 0, j = 0;\n    while (i < left.length && j < right.length)\n        result.push(left[i] <= right[j] ? left[i++] : right[j++]);\n    return result.concat(left.slice(i), right.slice(j));\n}`,
                c: `void merge(int arr[], int l, int m, int r) {\n    int n1 = m - l + 1, n2 = r - m;\n    int L[n1], R[n2];\n    for (int i = 0; i < n1; i++) L[i] = arr[l + i];\n    for (int j = 0; j < n2; j++) R[j] = arr[m + 1 + j];\n    int i = 0, j = 0, k = l;\n    while (i < n1 && j < n2)\n        arr[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];\n    while (i < n1) arr[k++] = L[i++];\n    while (j < n2) arr[k++] = R[j++];\n}\n\nvoid mergeSort(int arr[], int l, int r) {\n    if (l >= r) return;\n    int m = l + (r - l) / 2;\n    mergeSort(arr, l, m);\n    mergeSort(arr, m + 1, r);\n    merge(arr, l, m, r);\n}`
            }
        },
        {
            name: 'Dynamic Programming',
            icon: '📊',
            snippets: {
                python: `# 0/1 Knapsack\ndef knapsack(weights, values, capacity):\n    n = len(weights)\n    dp = [[0] * (capacity + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for w in range(capacity + 1):\n            dp[i][w] = dp[i-1][w]\n            if weights[i-1] <= w:\n                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])\n    return dp[n][capacity]`,
                cpp: `// 0/1 Knapsack DP\nint knapsack(vector<int>& wt, vector<int>& val, int cap) {\n    int n = wt.size();\n    vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0));\n    for (int i = 1; i <= n; i++) {\n        for (int w = 0; w <= cap; w++) {\n            dp[i][w] = dp[i-1][w];\n            if (wt[i-1] <= w)\n                dp[i][w] = max(dp[i][w], dp[i-1][w - wt[i-1]] + val[i-1]);\n        }\n    }\n    return dp[n][cap];\n}`,
                java: `static int knapsack(int[] wt, int[] val, int cap) {\n    int n = wt.length;\n    int[][] dp = new int[n + 1][cap + 1];\n    for (int i = 1; i <= n; i++) {\n        for (int w = 0; w <= cap; w++) {\n            dp[i][w] = dp[i-1][w];\n            if (wt[i-1] <= w)\n                dp[i][w] = Math.max(dp[i][w], dp[i-1][w - wt[i-1]] + val[i-1]);\n        }\n    }\n    return dp[n][cap];\n}`,
                javascript: `function knapsack(weights, values, capacity) {\n    const n = weights.length;\n    const dp = Array.from({length: n + 1}, () => Array(capacity + 1).fill(0));\n    for (let i = 1; i <= n; i++) {\n        for (let w = 0; w <= capacity; w++) {\n            dp[i][w] = dp[i-1][w];\n            if (weights[i-1] <= w)\n                dp[i][w] = Math.max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1]);\n        }\n    }\n    return dp[n][capacity];\n}`,
                c: `int knapsack(int wt[], int val[], int n, int cap) {\n    int dp[n+1][cap+1];\n    memset(dp, 0, sizeof(dp));\n    for (int i = 1; i <= n; i++) {\n        for (int w = 0; w <= cap; w++) {\n            dp[i][w] = dp[i-1][w];\n            if (wt[i-1] <= w && dp[i-1][w - wt[i-1]] + val[i-1] > dp[i][w])\n                dp[i][w] = dp[i-1][w - wt[i-1]] + val[i-1];\n        }\n    }\n    return dp[n][cap];\n}`
            }
        }
    ],

    getForLanguage(langKey) {
        const langMap = {
            'python': 'python', 'python3': 'python', 'py': 'python',
            'cpp': 'cpp', 'c': 'c',
            'java': 'java',
            'javascript': 'javascript', 'js': 'javascript', 'node': 'javascript',
            'typescript': 'javascript'
        };
        const mapped = langMap[langKey] || 'python';
        return this.categories.map(cat => ({
            name: cat.name,
            icon: cat.icon,
            code: cat.snippets[mapped] || cat.snippets['python'] || ''
        }));
    }
};
