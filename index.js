const { last, map } = require('ramda')
const { taggedSum } = require('daggy')

const { save, all } = require('./lib/db')
const { Task } = require('./lib/types')
const { liftF } = require('./lib/free')

const Db = taggedSum('Db', { Save: ['table', 'record'], All: ['table', 'query'] })
const Console = taggedSum('Console', { Question: ['q'], Print: ['s'] })

const AuthorTable = "authors"
const Author = name => ({ name })

const PostTable = "posts"
const Post = (title, body) => ({ title, body })

const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout })

const writeOutput = s => Task((rej, res) => res(console.log(s)))
const getInput = q => Task((rej, res) => readline.question(q, i => res(i.trim())))

const formatPost = post => `Post => ${post.title}:\n${post.body}`

const print = s => liftF(Console.Print(s))
const question = s => liftF(Console.Question(s))

const dbSave = (table, record) => liftF(Db.Save(table, record))
const dbAll = (table, query) => liftF(Db.All(table, query))

const menu = () =>
  question('Where do you want to go today? (createAuthor, write, latest, all) ')
    .map(route => router[route])

const allPosts = () =>
  dbAll(PostTable)
    .map(map(formatPost))
    .map(map(console.log))
    .map(() => menu)

const latest = () =>
  dbAll(PostTable)
    .map(posts => last(posts))
    .map(formatPost)
    .chain(print)
    .map(() => menu)

const write = () =>
  question('Title: ')
    .chain(title =>
      question('Boby: ')
        .map(body => Post(title, body))
    )
    .chain(post => dbSave(PostTable, post))
    .map(() => latest)

const createAuthor = () =>
  question('Name? ')
    .map(Author)
    .chain(author => dbSave(AuthorTable, author))
    .map(() => menu)

const start = () =>
  dbAll(AuthorTable)
    .map(authors => authors.length ? menu : createAuthor)

const router = { createAuthor, menu, write, latest, all: allPosts }

const dbToTask = x => x.cata({ Save: save, All: all })
const consoleToTask = x => x.cata({ Question: getInput, Print: writeOutput })

const interpret = x => x.table ? dbToTask(x) : consoleToTask(x)

const runApp = f => f()
  .foldMap(interpret, Task.of)
  .fork(console.error, runApp)

runApp(start)
