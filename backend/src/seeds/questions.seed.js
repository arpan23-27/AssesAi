require('dotenv').config();
// src/seeds/questions.seed.js
const mongoose = require('mongoose');
const crypto = require('crypto');
const Question = require('../models/question.model');

async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URI);
}

async function seedQuestions() {
  try {
    await connectMongo();

   const questions = [
  // CLOSURES - basic
  {
    technology: 'javascript', concept: 'closures', difficulty: 'basic', difficulty_score: 0.2,
    text: 'What is a closure in JavaScript?',
    options: ['A function bundled with its lexical environment', 'A block of code that runs immediately', 'A way to declare constants', 'A method to close a browser tab'],
    correct_index: 0, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'closures', difficulty: 'basic', difficulty_score: 0.25,
    text: 'Why are closures commonly used in JavaScript?',
    options: ['To share variables between unrelated functions', 'To preserve access to outer scope variables after the outer function returns', 'To prevent garbage collection of all variables', 'To make functions run faster'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'closures', difficulty: 'basic', difficulty_score: 0.3,
    text: 'Which of the following demonstrates a closure?',
    options: ['const x = 5', 'function outer() { let x = 1; return function() { return x; } }', 'class Foo { constructor() {} }', 'setTimeout(() => {}, 0)'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  // CLOSURES - intermediate
  {
    technology: 'javascript', concept: 'closures', difficulty: 'intermediate', difficulty_score: 0.5,
    text: 'What does the following code output? for(var i=0; i<3; i++) { setTimeout(() => console.log(i), 0) }',
    options: ['0 1 2', '3 3 3', '0 0 0', 'undefined undefined undefined'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'closures', difficulty: 'intermediate', difficulty_score: 0.55,
    text: 'How do you fix a closure-in-loop bug using let?',
    options: ['Replace var with let so each iteration gets its own scope', 'Use const instead of var', 'Wrap the loop in a try-catch', 'Add "use strict" at the top'],
    correct_index: 0, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  // PROMISES - basic
  {
    technology: 'javascript', concept: 'promises', difficulty: 'basic', difficulty_score: 0.2,
    text: 'What does a JavaScript Promise represent?',
    options: ['A synchronous function call', 'An eventual completion or failure of an async operation', 'A type of loop', 'A class constructor pattern'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'promises', difficulty: 'basic', difficulty_score: 0.25,
    text: 'Which Promise method runs regardless of whether the promise resolved or rejected?',
    options: ['.then()', '.catch()', '.finally()', '.resolve()'],
    correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'promises', difficulty: 'basic', difficulty_score: 0.3,
    text: 'What is the difference between Promise.all and Promise.race?',
    options: ['No difference', 'Promise.all waits for all; Promise.race resolves with the first settled', 'Promise.race waits for all; Promise.all resolves with the first', 'Promise.all only handles rejections'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  // PROMISES - intermediate
  {
    technology: 'javascript', concept: 'promises', difficulty: 'intermediate', difficulty_score: 0.5,
    text: 'What happens if you throw inside a .then() handler?',
    options: ['The error is silently ignored', 'The program crashes', 'The returned promise rejects with that error', 'The error propagates synchronously'],
    correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'promises', difficulty: 'intermediate', difficulty_score: 0.6,
    text: 'What does Promise.allSettled return compared to Promise.all?',
    options: ['They are identical', 'allSettled resolves with all outcomes including rejections; all rejects on first failure', 'allSettled only returns rejected promises', 'all returns all outcomes; allSettled fails fast'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  // EVENT LOOP - basic
  {
    technology: 'javascript', concept: 'event-loop', difficulty: 'basic', difficulty_score: 0.2,
    text: 'What is the JavaScript event loop responsible for?',
    options: ['Compiling JavaScript code', 'Managing memory allocation', 'Moving tasks from the queue to the call stack when it is empty', 'Handling CSS animations'],
    correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'event-loop', difficulty: 'basic', difficulty_score: 0.25,
    text: 'Which queue do setTimeout callbacks go into?',
    options: ['Microtask queue', 'Macrotask queue', 'Call stack', 'Render queue'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'event-loop', difficulty: 'basic', difficulty_score: 0.3,
    text: 'Which executes first: Promise.then or setTimeout?',
    options: ['setTimeout', 'Promise.then (microtask queue runs before macrotask)', 'They execute in the order written', 'Depends on the browser'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  // EVENT LOOP - intermediate
  {
    technology: 'javascript', concept: 'event-loop', difficulty: 'intermediate', difficulty_score: 0.5,
    text: 'What is the output order? console.log(1); setTimeout(()=>console.log(2),0); Promise.resolve().then(()=>console.log(3)); console.log(4)',
    options: ['1 2 3 4', '1 4 2 3', '1 4 3 2', '1 3 4 2'],
    correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },
  {
    technology: 'javascript', concept: 'event-loop', difficulty: 'intermediate', difficulty_score: 0.6,
    text: 'Why does a long-running synchronous task block the UI in a browser?',
    options: ['Because it uses too much memory', 'Because JavaScript is single-threaded and blocks the event loop from processing other tasks', 'Because CSS cannot update during JS execution', 'Because the garbage collector pauses everything'],
    correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' }
  },

  // REACT - basic
{ technology: 'react', concept: 'hooks', difficulty: 'basic', difficulty_score: 0.2, text: 'What does useState return?', options: ['A single state value', 'An array with a state value and a setter function', 'A ref object', 'A memoized value'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'react', concept: 'hooks', difficulty: 'basic', difficulty_score: 0.25, text: 'When does useEffect run by default?', options: ['Only on mount', 'Only on unmount', 'After every render', 'Only when state changes'], correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'react', concept: 'hooks', difficulty: 'basic', difficulty_score: 0.3, text: 'What is the purpose of the dependency array in useEffect?', options: ['To list props the component receives', 'To control when the effect re-runs', 'To declare state variables', 'To memoize the component'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'react', concept: 'state', difficulty: 'basic', difficulty_score: 0.2, text: 'What triggers a re-render in React?', options: ['Directly mutating state', 'Calling setState or a state setter', 'Changing a variable inside the component', 'Importing a new module'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'react', concept: 'state', difficulty: 'basic', difficulty_score: 0.3, text: 'Why should you never mutate state directly in React?', options: ['It causes a syntax error', 'React will not detect the change and re-render', 'It deletes the component', 'It resets all props'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'react', concept: 'lifecycle', difficulty: 'basic', difficulty_score: 0.25, text: 'Which hook replaces componentDidMount in functional components?', options: ['useState', 'useCallback', 'useEffect with empty dependency array', 'useRef'], correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },

// NODE.JS - basic
{ technology: 'nodejs', concept: 'events', difficulty: 'basic', difficulty_score: 0.2, text: 'What is the EventEmitter in Node.js?', options: ['A built-in HTTP server', 'A class that allows objects to emit and listen for named events', 'A file system watcher', 'A stream transformer'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'nodejs', concept: 'events', difficulty: 'basic', difficulty_score: 0.25, text: 'What does process.nextTick() do?', options: ['Delays execution by 1 tick of the clock', 'Schedules a callback to run before the next event loop iteration', 'Runs code after all I/O events', 'Exits the current process'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'nodejs', concept: 'modules', difficulty: 'basic', difficulty_score: 0.2, text: 'What is the difference between require() and import in Node.js?', options: ['No difference', 'require is CommonJS (synchronous), import is ES Module (static)', 'import is older than require', 'require only works in browsers'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'nodejs', concept: 'modules', difficulty: 'basic', difficulty_score: 0.3, text: 'What does module.exports do?', options: ['Imports another module', 'Defines what a module exposes when required by another file', 'Creates a new module', 'Runs the module in isolation'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'nodejs', concept: 'streams', difficulty: 'basic', difficulty_score: 0.25, text: 'Why are streams useful in Node.js?', options: ['They make code run faster by using multiple threads', 'They process data chunk by chunk without loading it all into memory', 'They automatically cache responses', 'They replace callbacks entirely'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'nodejs', concept: 'streams', difficulty: 'basic', difficulty_score: 0.3, text: 'Which of these is a readable stream in Node.js?', options: ['fs.createWriteStream()', 'process.stdout', 'fs.createReadStream()', 'net.createServer()'], correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },

// PYTHON - basic
{ technology: 'python', concept: 'decorators', difficulty: 'basic', difficulty_score: 0.2, text: 'What is a decorator in Python?', options: ['A type of comment', 'A function that wraps another function to extend its behaviour', 'A class method', 'A way to declare constants'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'python', concept: 'decorators', difficulty: 'basic', difficulty_score: 0.25, text: 'What does @staticmethod do in Python?', options: ['Makes the method private', 'Defines a method that does not receive self or cls as first argument', 'Caches the method result', 'Makes the class immutable'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'python', concept: 'generators', difficulty: 'basic', difficulty_score: 0.2, text: 'What keyword turns a function into a generator in Python?', options: ['return', 'async', 'yield', 'generate'], correct_index: 2, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'python', concept: 'generators', difficulty: 'basic', difficulty_score: 0.3, text: 'What is the benefit of a generator over a list?', options: ['Generators are faster to index', 'Generators produce values lazily saving memory', 'Generators support more data types', 'Generators run in parallel'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'python', concept: 'async', difficulty: 'basic', difficulty_score: 0.25, text: 'What does the async keyword do in Python?', options: ['Makes a function run in a separate thread', 'Defines a coroutine that can be awaited', 'Speeds up the function automatically', 'Disables the GIL for that function'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
{ technology: 'python', concept: 'async', difficulty: 'basic', difficulty_score: 0.3, text: 'What does await do in an async function?', options: ['Blocks the entire program until done', 'Pauses the coroutine and yields control back to the event loop', 'Creates a new thread', 'Converts the result to a promise'], correct_index: 1, source: 'manual', status: 'active', metadata: { prompt_version: 'v1', model: 'manual' } },
];

    for (const q of questions) {
      const hash = crypto.createHash('sha256').update(q.text).digest('hex');
      const exists = await Question.findOne({ text_hash: hash });
      if (exists) {
        console.log(`Skipped existing: ${q.text.slice(0, 40)}...`);
        continue;
      }
      await Question.create({ ...q, text_hash: hash });
      console.log(`Inserted: ${q.text.slice(0, 40)}...`);
    }

    console.log('Questions seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding questions:', err);
    process.exit(1);
  }
}

// Run standalone
seedQuestions();