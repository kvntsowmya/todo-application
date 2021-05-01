const express = require("express");
const path = require("path");

const { format } = require("date-fns");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery["category"] !== undefined &&
    requestQuery["priority"] !== undefined
  );
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityAndStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const categoryArray = ["WORK", "HOME", "LEARNING"];
const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
const priorityArray = ["HIGH", "LOW", "MEDIUM"];

const dataObjectToResponsiveObject = (dataObject) => {
  return {
    id: dataObject.id,
    todo: dataObject.todo,
    priority: dataObject.priority,
    category: dataObject.category,
    status: dataObject.status,
    dueDate: dataObject.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let todosQuery = "";
  let data = "";
  const { search_q = "", status, priority, category, due_date } = request.query;

  switch (true) {
    case hasCategoryAndPriority(request.query):
      if (
        categoryArray.some((item) => item === request.query.category) &&
        priorityArray.some((item) => item === request.query.priority)
      ) {
        todosQuery = `
      select * from 
      todo
      where todo like '%${search_q}%'
      and priority = '${priority}'
      and category = '${category}';`;
        data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
        break;
      } else {
        response.status(400);
        response.send("Invalid Category or priority");
      }
    case hasCategoryAndStatus(request.query):
      console.log("category and status");
      if (
        categoryArray.some((item) => item === request.query.category) &&
        statusArray.some((item) => item === request.query.status)
      ) {
        todosQuery = `
      select * from
      todo
      where todo like '%${search_q}%'
      and category = '${category}'
      and status = '${status}';`;
        data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
        break;
      } else {
        response.status(400);
        response.send("Invalid category or status");
      }
    case hasPriorityAndStatus(request.query):
      console.log("priority and status");
      if (
        statusArray.some((item) => item === request.query.status) &&
        priorityArray.some((item) => item === request.query.priority)
      ) {
        todosQuery = `
      select * from
      todo
      where todo like '%${search_q}%'
      and priority = '${priority}'
      and status = '${status}';`;
        data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
        break;
      } else {
        response.status(400);
        response.send("Invalid status or priority");
      }
    case request.query.category !== undefined:
      if (categoryArray.some((item) => item === request.query.category)) {
        todosQuery = `
      select * from todo
      where todo like '%${search_q}%'
      and category = '${category}';`;
        data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    case request.query.search_q !== undefined:
      todosQuery = `
      select *
      from todo
      where todo like '%${search_q}%';`;
      data = await db.all(todosQuery);
      response.send(data.map((item) => dataObjectToResponsiveObject(item)));
      break;
    case request.query.priority !== undefined:
      if (priorityArray.some((item) => item === request.query.priority)) {
        todosQuery = `
      select *
      from todo
      where todo like '%${search_q}%' and priority = '${priority}'
      ;`;
        data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case request.query.status !== undefined:
      if (statusArray.some((item) => item === request.query.status)) {
        todosQuery = `
      select *
      from todo
      where status = '${status}'
      and todo like '%${search_q}%'`;
        const data = await db.all(todosQuery);
        response.send(data.map((item) => dataObjectToResponsiveObject(item)));
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  console.log(todoId);

  const getTodoQuery = `
    select * 
    from todo
    where id = ${todoId};`;

  const todoResponse = await db.get(getTodoQuery);
  response.send(dataObjectToResponsiveObject(todoResponse));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  const dateArray = date.split("-");
  const dateMonth = parseInt(dateArray[1]) < 13;
  const dateDay = parseInt(dateArray[2]) <= 31;

  if (dateMonth && dateDay) {
    const getTodoDateQuery = `
    SELECT *
    FROM todo
    WHERE due_date = '${date}';`;

    const dateResponse = await db.all(getTodoDateQuery);
    response.send(
      dateResponse.map((item) => dataObjectToResponsiveObject(item))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const date = dueDate.split("-");
  const month = parseInt(date[1]) < 13;
  const day = parseInt(date[2]) < 31;
  if (
    (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") &&
    (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
    (category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    if (month && day) {
      const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_Date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${format(
        new Date(dueDate),
        "yyyy-MM-dd"
      )}');`;
      await db.run(postTodoQuery);
      response.send("Todo Successfully Added");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else if (
    !(status === "TO DO" || status === "IN PROGRESS" || status === "DONE") &&
    (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
    (category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") &&
    !(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
    (category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") &&
    (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
    !(category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  let putQuery = null;
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  switch (true) {
    case request.body.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        putQuery = `
        update todo
        set status = '${status}'
        where id = ${todoId};`;
        await db.run(putQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case request.body.priority !== undefined:
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        putQuery = `
        update todo
        set priority = '${priority}'
        where id = ${todoId};`;
        await db.run(putQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case request.body.todo !== undefined:
      putQuery = `
        update todo
        set todo = '${todo}'
        where id = ${todoId};`;
      await db.run(putQuery);
      response.send("Todo Updated");
      break;
    case request.body.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        putQuery = `
        update todo
        set category = '${category}'
        where id = ${todoId};`;
        await db.run(putQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      const stringdate = dueDate.split("-");
      const months = parseInt(stringdate[1]) < 13;
      const days = parseInt(stringdate[2]) < 31;

      if (months && days) {
        putQuery = `
        update todo
        set due_date = '${dueDate}'
        where id = ${todoId};`;
        await db.run(putQuery);
        response.send("Due Date Updated");
        break;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteRowQuery = `
    DELETE FROM
    todo
    WHERE id = ${todoId};`;

  await db.run(deleteRowQuery);
  response.send("Todo Deleted");
});

module.exports = app;
