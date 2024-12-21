# RealTimeDB

RealTimeDB is a TypeScript wrapper for interacting with Firebase's Real-Time Database using HTTP requests. It provides an easy way to read and write data while handling authentication and event-based readiness.

---

## Features

- Read data from Firebase Real-Time Database
- Write data to Firebase Real-Time Database
- Event-based readiness for initialization
- Easy-to-use interface with TypeScript types

---

## Installation

1. Clone or download the repository.
2. Ensure you have Firebase Real-Time Database enabled in your Firebase project.
3. Import The `RealTimeDB` class and begin

# Eamples

```ts
//Create The Client
const rtdb = new FireBase.RealTimeDB("database-name", "database-secret");

//Fire When The Client Is Ready
rtdb.once(Event.Ready, async () => {
  //Get The Users Data
  const value = await rtdb.get("users");
  //Validate Its An Object
  if (value && typeof value === "object") {
    //Loop Through The Entries
    Object.entries(value).forEach(([user, data]) =>
      //Console Log All The Users And Their Data
      console.log(`\nUser: ${user}\nData: ${JSON.stringify(data, null, 2)}\n`)
    );
  }
});
```
