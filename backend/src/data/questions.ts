import type { Difficulty } from '@/models/Question';

export interface SeedQuestion {
  technology: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctAnswer: number; // index into options
}

/**
 * The hardest-question bank: 5 per technology across every direction.
 * `correctAnswer` is the index of the correct option and is stripped from
 * every client response (`select:false` on the schema).
 */
export const seedQuestions: SeedQuestion[] = [
  // ---------------- HTML ----------------
  {
    technology: 'html',
    difficulty: 'middle',
    text: 'Which element is the correct semantic choice for the single, dominant content of a document?',
    options: ['<section>', '<main>', '<article>', '<div>'],
    correctAnswer: 1,
  },
  {
    technology: 'html',
    difficulty: 'senior',
    text: 'What does the `defer` attribute on a <script> tag do?',
    options: [
      'Executes immediately, blocking HTML parsing',
      'Downloads in parallel and executes after parsing completes, preserving order',
      'Executes as soon as downloaded, order not guaranteed',
      'Prevents the script from ever loading',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'html',
    difficulty: 'middle',
    text: 'What is the primary purpose of the <picture> element?',
    options: [
      'Provide multiple responsive/art-directed image sources',
      'Draw graphics via JavaScript',
      'Embed a video stream',
      'Create a clickable image map',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'html',
    difficulty: 'senior',
    text: 'Which ARIA attribute makes a live region announce updates without interrupting the user?',
    options: ['aria-hidden="true"', 'aria-live="polite"', 'role="presentation"', 'aria-disabled'],
    correctAnswer: 1,
  },
  {
    technology: 'html',
    difficulty: 'middle',
    text: 'What does <meta name="viewport" content="width=device-width, initial-scale=1"> control?',
    options: [
      'The character encoding',
      'The responsive layout viewport on mobile devices',
      'The SEO meta description',
      'The favicon size',
    ],
    correctAnswer: 1,
  },

  // ---------------- CSS ----------------
  {
    technology: 'css',
    difficulty: 'senior',
    text: 'Which of the following creates a new stacking context on its own?',
    options: ['float: left', 'position: relative (with no z-index)', 'opacity less than 1', 'display: block'],
    correctAnswer: 2,
  },
  {
    technology: 'css',
    difficulty: 'middle',
    text: 'With `box-sizing: border-box`, the specified `width` includes:',
    options: [
      'Content only',
      'Content + padding',
      'Content + padding + border',
      'Content + padding + border + margin',
    ],
    correctAnswer: 2,
  },
  {
    technology: 'css',
    difficulty: 'middle',
    text: 'Which selector has the highest specificity?',
    options: ['#id', '.class.class', 'div p a', 'a:hover'],
    correctAnswer: 0,
  },
  {
    technology: 'css',
    difficulty: 'senior',
    text: 'What does `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` produce?',
    options: [
      'Exactly one 200px column',
      'As many columns of at least 200px as fit, each flexible up to 1fr',
      'Fixed 200px columns that never grow',
      'Rows instead of columns',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'css',
    difficulty: 'middle',
    text: 'Which `position` value removes an element from normal flow and positions it relative to the nearest positioned ancestor?',
    options: ['static', 'relative', 'absolute', 'sticky'],
    correctAnswer: 2,
  },

  // ---------------- Bootstrap ----------------
  {
    technology: 'bootstrap',
    difficulty: 'middle',
    text: 'How many columns does the default Bootstrap grid system have?',
    options: ['10', '12', '16', '24'],
    correctAnswer: 1,
  },
  {
    technology: 'bootstrap',
    difficulty: 'middle',
    text: 'Which classes make a column full width on mobile and half width from the md breakpoint up?',
    options: ['col-6', 'col-md-6', 'col-12 col-md-6', 'col-sm-6'],
    correctAnswer: 2,
  },
  {
    technology: 'bootstrap',
    difficulty: 'senior',
    text: 'Which statement is TRUE about Bootstrap 5?',
    options: [
      'It still requires jQuery',
      'It dropped the jQuery dependency and uses vanilla JavaScript',
      'It removed the grid system entirely',
      'It only supports Internet Explorer',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'bootstrap',
    difficulty: 'middle',
    text: 'Which utility class horizontally centers a block-level element with auto margins?',
    options: ['mx-auto', 'text-center', 'float-center', 'center-block'],
    correctAnswer: 0,
  },
  {
    technology: 'bootstrap',
    difficulty: 'middle',
    text: 'How does `.container-fluid` differ from `.container`?',
    options: [
      'It is fixed width at every breakpoint',
      'It spans 100% width at every breakpoint',
      'It adds a default border',
      'There is no difference',
    ],
    correctAnswer: 1,
  },

  // ---------------- Tailwind ----------------
  {
    technology: 'tailwind',
    difficulty: 'middle',
    text: 'What does the `space-x-4` utility do?',
    options: [
      'Adds horizontal spacing between child elements',
      'Adds padding to the element',
      'Sets a fixed width',
      'Only affects CSS grid gaps',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'tailwind',
    difficulty: 'middle',
    text: 'How do you apply a utility only on hover in Tailwind?',
    options: ['hover-bg-blue-500', 'hover:bg-blue-500', ':hover-bg-blue-500', 'on-hover:bg-blue-500'],
    correctAnswer: 1,
  },
  {
    technology: 'tailwind',
    difficulty: 'senior',
    text: 'What is the `@apply` directive used for?',
    options: [
      'Running JavaScript inside CSS',
      'Composing existing utility classes into a custom CSS class',
      'Declaring media queries',
      'Importing web fonts',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'tailwind',
    difficulty: 'senior',
    text: 'Using the JIT engine, how do you set an arbitrary width of 137px?',
    options: ['w-137', 'w-[137px]', 'w-(137px)', 'width-137'],
    correctAnswer: 1,
  },
  {
    technology: 'tailwind',
    difficulty: 'middle',
    text: 'With `darkMode: "class"` configured, which prefix applies styles in dark mode?',
    options: [
      'dark:* (active when an ancestor has the `dark` class)',
      '@dark',
      'theme-dark:*',
      'night:*',
    ],
    correctAnswer: 0,
  },

  // ---------------- JavaScript ----------------
  {
    technology: 'javascript',
    difficulty: 'middle',
    text: 'What does `typeof NaN` return?',
    options: ['"NaN"', '"number"', '"undefined"', '"object"'],
    correctAnswer: 1,
  },
  {
    technology: 'javascript',
    difficulty: 'middle',
    text: 'What is the result of `[1, 2, 3].reduce((a, b) => a + b)`?',
    options: ['6', '[1, 2, 3]', '"123"', 'TypeError'],
    correctAnswer: 0,
  },
  {
    technology: 'javascript',
    difficulty: 'middle',
    text: 'Which best describes the difference between `==` and `===`?',
    options: [
      'There is no difference',
      '`===` compares value and type with no coercion; `==` performs type coercion',
      '`==` checks type, `===` does not',
      '`===` only works on numbers',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'javascript',
    difficulty: 'senior',
    text: 'What does `Promise.allSettled` resolve with?',
    options: [
      'It rejects on the first rejection',
      'An array of {status, value|reason} for every promise regardless of outcome',
      'The first settled value only',
      'The same result as Promise.race',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'javascript',
    difficulty: 'senior',
    text: 'What does a closure capture from its enclosing scope?',
    options: [
      'A snapshot copy of variable values at definition time',
      'A live reference to variables in the enclosing lexical scope',
      'Only global variables',
      'Nothing — closures do not capture variables',
    ],
    correctAnswer: 1,
  },

  // ---------------- TypeScript ----------------
  {
    technology: 'typescript',
    difficulty: 'senior',
    text: 'How does `unknown` differ from `any`?',
    options: [
      'They are identical',
      '`unknown` requires narrowing or an assertion before you can operate on it',
      '`unknown` disables all type checking',
      '`unknown` is only assignable to number',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'typescript',
    difficulty: 'senior',
    text: 'What is a discriminated union?',
    options: [
      'A union whose members share a common literal property used to narrow the variant',
      'Any union of two or more types',
      'An intersection of object types',
      'A generic constraint using extends',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'typescript',
    difficulty: 'middle',
    text: 'What does `keyof { a: 1; b: 2 }` evaluate to?',
    options: ['"a" | "b"', '1 | 2', 'string', 'never'],
    correctAnswer: 0,
  },
  {
    technology: 'typescript',
    difficulty: 'middle',
    text: 'What does a `readonly string[]` type prevent?',
    options: [
      'Reading elements',
      'Mutating methods (push/pop) and index assignment',
      'Iterating with for..of',
      'Accessing .length',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'typescript',
    difficulty: 'senior',
    text: 'What is the effect of `as const` on an object literal?',
    options: [
      'Makes every property mutable',
      'Widens property types to their base types',
      'Produces a deeply readonly value with narrowed literal types',
      'Converts the object into a class instance',
    ],
    correctAnswer: 2,
  },

  // ---------------- React ----------------
  {
    technology: 'react',
    difficulty: 'senior',
    text: 'Why must React Hooks not be called conditionally?',
    options: [
      'Purely for performance reasons',
      'React associates state with hooks by call order, which must be stable across renders',
      'It is only a lint style preference',
      'JavaScript forbids conditional function calls',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'react',
    difficulty: 'middle',
    text: 'What does `useMemo` do?',
    options: [
      'Memoizes a computed value between renders based on its dependencies',
      'Runs side effects after render',
      'Creates a mutable ref',
      'Is an alias for useState',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'react',
    difficulty: 'middle',
    text: 'What should list `key` props be?',
    options: [
      'Always the array index',
      'Stable, unique identifiers tied to each item',
      'A random value regenerated each render',
      'Optional and ignored by React',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'react',
    difficulty: 'senior',
    text: 'Which of these reliably triggers a re-render?',
    options: [
      'Mutating a state object in place',
      'Calling the state setter with a new value/reference',
      'Assigning to a ref’s `.current`',
      'Editing the DOM node directly',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'react',
    difficulty: 'middle',
    text: 'What is the role of the dependency array in `useEffect`?',
    options: [
      'It sets the component’s initial state',
      'It controls when the effect re-runs by comparing dependencies between renders',
      'It memoizes the whole component',
      'It is decorative and has no effect',
    ],
    correctAnswer: 1,
  },

  // ---------------- Vue ----------------
  {
    technology: 'vue',
    difficulty: 'middle',
    text: 'Which Vue 3 API introduced `setup()` and composable functions?',
    options: ['Options API', 'Composition API', 'Mixins', 'Vuex'],
    correctAnswer: 1,
  },
  {
    technology: 'vue',
    difficulty: 'senior',
    text: 'What does `ref()` return in Vue 3?',
    options: [
      'A plain unwrapped value',
      'A reactive wrapper object accessed through its `.value` property',
      'A computed property',
      'A raw DOM node only',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'vue',
    difficulty: 'middle',
    text: 'Which directive binds an attribute to an expression (shorthand `:`)?',
    options: ['v-model', 'v-bind', 'v-on', 'v-if'],
    correctAnswer: 1,
  },
  {
    technology: 'vue',
    difficulty: 'senior',
    text: 'How do `computed` properties behave in Vue?',
    options: [
      'They re-evaluate on every access',
      'They are cached and only re-evaluate when a reactive dependency changes',
      'They behave exactly like methods',
      'They are not reactive',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'vue',
    difficulty: 'middle',
    text: 'What does `v-model` provide on a form input?',
    options: [
      'One-way binding from state to view only',
      'Two-way binding between the input and the bound state',
      'Event handling with no data binding',
      'Conditional rendering',
    ],
    correctAnswer: 1,
  },

  // ---------------- Next.js ----------------
  {
    technology: 'nextjs',
    difficulty: 'senior',
    text: 'In the Next.js App Router, components are by default:',
    options: ['Client Components', 'Server Components', 'Static-only components', 'Edge-only components'],
    correctAnswer: 1,
  },
  {
    technology: 'nextjs',
    difficulty: 'middle',
    text: 'Which Pages Router function fetches data at build time?',
    options: ['getServerSideProps', 'getStaticProps', 'useEffect', 'getInitialProps'],
    correctAnswer: 1,
  },
  {
    technology: 'nextjs',
    difficulty: 'middle',
    text: 'How do you opt a component into client-side interactivity in the App Router?',
    options: [
      'Add the "use server" directive',
      'Add the "use client" directive at the top of the file',
      'Export `const client = true`',
      'Do nothing — all components are client by default',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'nextjs',
    difficulty: 'middle',
    text: 'What does the `next/image` component primarily provide?',
    options: [
      'SEO text optimization',
      'Automatic resizing, lazy-loading, and modern format optimization for images',
      'Client-side routing',
      'Global CSS handling',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'nextjs',
    difficulty: 'senior',
    text: 'In the App Router, a `loading.tsx` file in a route segment provides:',
    options: [
      'A custom 404 page',
      'An automatic Suspense-based loading UI for that segment',
      'Global stylesheet injection',
      'Edge middleware',
    ],
    correctAnswer: 1,
  },

  // ---------------- Git ----------------
  {
    technology: 'git',
    difficulty: 'senior',
    text: 'How does `git rebase` differ from `git merge`?',
    options: [
      'They are functionally identical',
      'Rebase reapplies commits onto a new base (rewriting history, linear); merge records a merge commit',
      'Rebase deletes branches',
      'Rebase only works with remotes',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'git',
    difficulty: 'senior',
    text: 'What does `git reset --hard HEAD~1` do?',
    options: [
      'Creates a new branch at HEAD',
      'Moves HEAD back one commit and discards working-tree and staged changes',
      'Only unstages files, keeping changes',
      'Pushes the previous commit to the remote',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'git',
    difficulty: 'middle',
    text: 'What is the difference between `git fetch` and `git pull`?',
    options: [
      'There is no difference',
      '`fetch` downloads refs without integrating; `pull` fetches then merges/rebases',
      '`pull` only downloads without merging',
      '`fetch` automatically merges into the current branch',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'git',
    difficulty: 'senior',
    text: 'What is a "detached HEAD" state?',
    options: [
      'A corrupted repository',
      'HEAD points directly at a commit instead of at a branch reference',
      'An unresolved merge conflict',
      'A tracking remote branch',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'git',
    difficulty: 'middle',
    text: 'What is the purpose of a `.gitignore` file?',
    options: [
      'To delete tracked files from history',
      'To specify intentionally untracked files Git should ignore',
      'To store repository credentials',
      'To configure remote URLs',
    ],
    correctAnswer: 1,
  },

  // ---------------- Node.js ----------------
  {
    technology: 'nodejs',
    difficulty: 'senior',
    text: 'How are microtasks (Promise callbacks) scheduled relative to macrotasks in Node.js?',
    options: [
      'All macrotasks run first, then microtasks',
      'The microtask queue is drained after each macrotask, before the next one',
      'Microtasks never run',
      'They share a single FIFO queue with timers',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'nodejs',
    difficulty: 'senior',
    text: 'When do `process.nextTick` callbacks run?',
    options: [
      'After all I/O callbacks',
      'Before the event loop continues, ahead of the Promise microtask queue',
      'Only after timers fire',
      'They are never executed',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'nodejs',
    difficulty: 'middle',
    text: 'Which function is the CommonJS module import mechanism?',
    options: ['import', 'require()', 'include()', 'use()'],
    correctAnswer: 1,
  },
  {
    technology: 'nodejs',
    difficulty: 'middle',
    text: 'Which best describes the Node.js runtime model?',
    options: [
      'Multi-threaded and blocking by default',
      'Single-threaded, non-blocking I/O via an event loop, backed by a libuv thread pool',
      'A browser rendering engine',
      'A relational database engine',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'nodejs',
    difficulty: 'middle',
    text: 'What does the Node.js `Buffer` class handle?',
    options: ['Async timing', 'Raw binary data', 'HTTP routing', 'HTML templating'],
    correctAnswer: 1,
  },

  // ---------------- Express ----------------
  {
    technology: 'express',
    difficulty: 'middle',
    text: 'What is the standard signature of an Express middleware function?',
    options: ['(req, res)', '(req, res, next)', '(next)', '(err)'],
    correctAnswer: 1,
  },
  {
    technology: 'express',
    difficulty: 'middle',
    text: 'Which built-in middleware parses JSON request bodies in modern Express?',
    options: ['Only the external body-parser package', 'express.json()', 'express.raw()', 'No middleware is needed'],
    correctAnswer: 1,
  },
  {
    technology: 'express',
    difficulty: 'senior',
    text: 'Why does middleware registration order matter in Express?',
    options: [
      'It does not matter',
      'Middleware runs in the order registered, so a route or handler can be shadowed by earlier ones',
      'Middleware runs alphabetically by name',
      'Middleware runs in random order',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'express',
    difficulty: 'senior',
    text: 'How does Express identify an error-handling middleware?',
    options: [
      'By its function name',
      'By its four-argument signature `(err, req, res, next)`',
      'By being declared async',
      'By a special route path',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'express',
    difficulty: 'middle',
    text: 'What does `res.status(201).json(data)` do?',
    options: [
      'Sets a cookie named 201',
      'Sets the HTTP status to 201 and sends `data` as a JSON response',
      'Issues a redirect to /201',
      'Sets a header without sending a body',
    ],
    correctAnswer: 1,
  },

  // ---------------- MongoDB ----------------
  {
    technology: 'mongodb',
    difficulty: 'middle',
    text: 'Which aggregation stage randomly selects documents?',
    options: ['$match', '$sample', '$random', '$limit'],
    correctAnswer: 1,
  },
  {
    technology: 'mongodb',
    difficulty: 'senior',
    text: 'A compound index `{ a: 1, b: 1 }` can efficiently support queries on:',
    options: [
      'Only b',
      'a alone, or a and b together (the index prefix) — but not b alone efficiently',
      'Only b alone',
      'Neither field',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'mongodb',
    difficulty: 'senior',
    text: 'What does the `$lookup` aggregation stage perform?',
    options: [
      'A left outer join to another collection',
      'A full-text search',
      'An in-memory sort',
      'A field projection',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'mongodb',
    difficulty: 'middle',
    text: 'Which statement about the `_id` field is TRUE?',
    options: [
      'It is optional and never indexed',
      'It is required, unique, and automatically indexed (an ObjectId by default)',
      'It must always be a string',
      'It is shared across documents in a collection',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'mongodb',
    difficulty: 'senior',
    text: 'What does a write concern of `w: "majority"` guarantee?',
    options: [
      'Fire-and-forget with no acknowledgement',
      'The write is acknowledged after a majority of replica-set members apply it',
      'Only the primary applies it with no acknowledgement',
      'Journaling is disabled',
    ],
    correctAnswer: 1,
  },

  // ---------------- SQL ----------------
  {
    technology: 'sql',
    difficulty: 'middle',
    text: 'Which JOIN returns all rows from the left table and matched rows from the right (NULLs where unmatched)?',
    options: ['INNER JOIN', 'LEFT (OUTER) JOIN', 'CROSS JOIN', 'RIGHT JOIN'],
    correctAnswer: 1,
  },
  {
    technology: 'sql',
    difficulty: 'senior',
    text: 'Which isolation level prevents dirty reads but still allows non-repeatable reads?',
    options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
    correctAnswer: 1,
  },
  {
    technology: 'sql',
    difficulty: 'middle',
    text: 'What does a `GROUP BY` clause do?',
    options: [
      'Filters individual rows before aggregation',
      'Groups rows sharing values so aggregate functions apply per group',
      'Sorts the final result set',
      'Joins two tables',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'sql',
    difficulty: 'senior',
    text: 'What is the difference between `WHERE` and `HAVING`?',
    options: [
      'They are interchangeable',
      'WHERE filters rows before grouping; HAVING filters groups after aggregation',
      'HAVING runs before grouping; WHERE after',
      'WHERE only works inside joins',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'sql',
    difficulty: 'middle',
    text: 'A PRIMARY KEY constraint guarantees that the column(s):',
    options: [
      'Allow nullable duplicates',
      'Are unique and non-null, backed by an index',
      'Are only non-null but may duplicate',
      'Reference another table',
    ],
    correctAnswer: 1,
  },

  // ---------------- REST ----------------
  {
    technology: 'rest',
    difficulty: 'middle',
    text: 'Which HTTP method is idempotent and used to fully replace a resource?',
    options: ['POST', 'PUT', 'PATCH', 'GET'],
    correctAnswer: 1,
  },
  {
    technology: 'rest',
    difficulty: 'middle',
    text: 'What does HTTP status 409 indicate?',
    options: [
      'The resource was not found',
      'The request conflicts with the current state of the server',
      'The client is unauthorized',
      'A generic server error',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'rest',
    difficulty: 'middle',
    text: 'Which status code best represents successful creation of a new resource?',
    options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
    correctAnswer: 1,
  },
  {
    technology: 'rest',
    difficulty: 'senior',
    text: 'What does REST "statelessness" mean?',
    options: [
      'The server stores per-client session state',
      'Each request carries all information needed; the server keeps no client session state between requests',
      'The API cannot use a database',
      'Responses can never be cached',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'rest',
    difficulty: 'middle',
    text: 'How does PATCH differ from PUT?',
    options: [
      'They are identical',
      'PATCH applies a partial update; PUT replaces the entire resource',
      'PATCH replaces the whole resource; PUT is partial',
      'PATCH deletes the resource',
    ],
    correctAnswer: 1,
  },

  // ---------------- Swift ----------------
  {
    technology: 'swift',
    difficulty: 'middle',
    text: 'What is an Optional in Swift?',
    options: [
      'A type that may hold a value or `nil`, requiring unwrapping before use',
      'A value that can never be nil',
      'A kind of protocol',
      'A loop construct',
    ],
    correctAnswer: 0,
  },
  {
    technology: 'swift',
    difficulty: 'middle',
    text: 'What is the difference between `let` and `var` in Swift?',
    options: [
      'Both are mutable',
      '`let` declares an immutable constant binding; `var` declares a mutable variable',
      '`let` is mutable, `var` is constant',
      'There is no difference',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'swift',
    difficulty: 'senior',
    text: 'What is the purpose of a `guard` statement?',
    options: [
      'To create a loop',
      'Early-exit control flow that must leave scope if the condition fails, while binding unwrapped optionals for later use',
      'To declare a class',
      'To manage memory manually',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'swift',
    difficulty: 'senior',
    text: 'How do structs differ from classes in Swift?',
    options: [
      'Both are reference types',
      'Structs are value types (copied on assignment); classes are reference types',
      'Structs are reference types; classes are value types',
      'There is no difference',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'swift',
    difficulty: 'senior',
    text: 'What is ARC in Swift?',
    options: [
      'A built-in UI framework',
      'Automatic Reference Counting — automatic memory management for class instances',
      'A networking library',
      'A concurrency scheduler',
    ],
    correctAnswer: 1,
  },

  // ---------------- Kotlin ----------------
  {
    technology: 'kotlin',
    difficulty: 'middle',
    text: 'What is the difference between `val` and `var` in Kotlin?',
    options: [
      'Both are mutable',
      '`val` is a read-only (immutable) reference; `var` is mutable',
      '`val` is mutable, `var` is read-only',
      'There is no difference',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'kotlin',
    difficulty: 'middle',
    text: 'What does the type `String?` mean in Kotlin?',
    options: [
      'A string that can never be null',
      'A nullable string that may hold null and requires safe calls (?.) or checks',
      'A list of strings',
      'A string that is always null',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'kotlin',
    difficulty: 'senior',
    text: 'What does declaring a `data class` provide?',
    options: [
      'A UI component base class',
      'Auto-generated equals(), hashCode(), toString(), and copy() from the primary constructor properties',
      'An abstract class with no implementation',
      'A guaranteed singleton',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'kotlin',
    difficulty: 'senior',
    text: 'What is a `companion object` used for?',
    options: [
      'Creating multiple instances',
      'Holding members tied to the class itself (similar to static members)',
      'Managing coroutines',
      'Defining interfaces',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'kotlin',
    difficulty: 'senior',
    text: 'What are coroutines used for in Kotlin?',
    options: [
      'Defining UI layouts',
      'Asynchronous, non-blocking concurrency using suspend functions',
      'Dependency injection',
      'Object serialization',
    ],
    correctAnswer: 1,
  },

  // ---------------- React Native ----------------
  {
    technology: 'react-native',
    difficulty: 'senior',
    text: 'Which core component renders long lists efficiently by only mounting visible items?',
    options: ['ScrollView', 'FlatList', 'View', 'Text'],
    correctAnswer: 1,
  },
  {
    technology: 'react-native',
    difficulty: 'middle',
    text: 'How is styling done in React Native?',
    options: [
      'External CSS files',
      'JavaScript style objects (StyleSheet) using a Flexbox-based layout system',
      'Inline HTML style attributes',
      'SCSS stylesheets',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'react-native',
    difficulty: 'senior',
    text: 'What historically connects JavaScript to native modules in React Native?',
    options: [
      'Plain HTTP requests',
      'The asynchronous bridge (now largely replaced by JSI in the new architecture)',
      'WebSockets',
      'localStorage',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'react-native',
    difficulty: 'middle',
    text: 'The `<View>` component is most analogous to which web element?',
    options: ['<span>', 'a <div> container', '<input>', '<script>'],
    correctAnswer: 1,
  },
  {
    technology: 'react-native',
    difficulty: 'middle',
    text: 'Which statement about React Native is TRUE?',
    options: [
      'It renders your UI inside a WebView',
      'It renders to actual native platform UI components',
      'It only supports Android',
      'It manipulates the browser DOM',
    ],
    correctAnswer: 1,
  },

  // ---------------- Flutter ----------------
  {
    technology: 'flutter',
    difficulty: 'middle',
    text: 'In Flutter, essentially everything in the UI is a:',
    options: ['Widget', 'Component class', 'Template', 'Directive'],
    correctAnswer: 0,
  },
  {
    technology: 'flutter',
    difficulty: 'senior',
    text: 'What distinguishes a StatefulWidget from a StatelessWidget?',
    options: [
      'There is no difference',
      'A StatefulWidget holds mutable state that can trigger rebuilds via setState(); a StatelessWidget is immutable',
      'A StatelessWidget holds mutable state',
      'A StatefulWidget can never rebuild',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'flutter',
    difficulty: 'middle',
    text: 'What does a Dart `Future` represent?',
    options: [
      'A synchronous, already-available value',
      'A value or error that will be available at some later time (asynchronous)',
      'A widget subtree',
      'A stream of many values over time',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'flutter',
    difficulty: 'middle',
    text: 'What does calling `setState()` do?',
    options: [
      'Navigates to a new screen',
      'Tells the framework the internal state changed so the widget rebuilds',
      'Disposes the widget',
      'Performs a network request',
    ],
    correctAnswer: 1,
  },
  {
    technology: 'flutter',
    difficulty: 'senior',
    text: 'What is a `BuildContext` in Flutter?',
    options: [
      'A database connection',
      'A handle to the location of a widget within the widget tree',
      'A theme configuration object',
      'A network client',
    ],
    correctAnswer: 1,
  },
];
