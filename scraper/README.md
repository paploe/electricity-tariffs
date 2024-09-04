# Swiss Electricity Tariffs

# API documentation

To create the API docs run:

```bash
npm run create-doc
```

Then open `apidoc/index.html`:

## Quickstart

### Create the .env file

Create the `.env` file by running:

```bash
mv .env.sample .env
```

Now replace all `<to-replace>` substrings in the generated `.env` file.

### Installation

```bash
npm i
```

### Compile and run

```bash
npm run lint && npm run prettify && npm run compile && npm run start
```

### Compile and run (docker)

```bash
# load all env variables
export $(grep -v '^#' .env | xargs)
npm run docker-build
npm run docker-run
```

### Test

```bash
npm run vitest
```
