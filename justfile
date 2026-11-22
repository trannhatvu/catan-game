set positional-arguments

default:
    @just --list

install:
    npm install

dev:
    npm run dev

dev-server:
    npm run dev:server

dev-client:
    npm run dev:client

build:
    npm run build

test *args:
    npm test -- "$@"

test-watch *args:
    npm run test:watch -- "$@"

simulate *args:
    npm run simulate -- "$@"

start:
    npm start

# Build and run the production server locally; does not deploy to a remote host.
deploy: build
    npm start
