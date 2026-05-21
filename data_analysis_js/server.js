const express = require("express");

const path = require("path");

const multer = require("multer");

const fs = require("fs");

const csv = require("csv-parser");

const session = require("express-session");

const app = express();

app.use(express.static("public"));

app.use(express.urlencoded(
{
    extended: true
}));

app.use(session(
{
    secret: "clinical-secret",

    resave: false,

    saveUninitialized: true
}));

const storage = multer.diskStorage(
{
    destination: function(req, file, cb)
    {
        cb(null, "uploads/");
    },

    filename: function(req, file, cb)
    {
        cb(null, file.originalname);
    }
});

const upload = multer(
{
    storage: storage
});

app.get("/", (req, res) =>
{
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", upload.single("csvfile"), (req, res) =>
{
    const results = [];

    fs.createReadStream(req.file.path)

    .pipe(csv())

    .on("data", (data) =>
    {
        results.push(data);
    })

    .on("end", () =>
    {
        if(results.length === 0)
        {
            return res.send("CSV file is empty");
        }

        req.session.csvData = results;

        const columns = Object.keys(results[0]);

        let html = `
            <html>

            <head>
                <title>Select Columns</title>
            </head>

            <body>

                <h1>Select Columns For Analysis</h1>

                <form action="/analyze" method="POST">
        `;

        columns.forEach((column) =>
        {
            html += `
                <input
                    type="checkbox"
                    name="columns"
                    value="${column}"
                >

                ${column}

                <br>
            `;
        });

        html += `
                    <br>

                    <button type="submit">
                        Analyze Selected Columns
                    </button>

                </form>

            </body>

            </html>
        `;

        res.send(html);
    });
});

app.post("/analyze", (req, res) =>
{
    const results = req.session.csvData;

    if(!results)
    {
        return res.send("No CSV data found");
    }

    const selectedColumns = [].concat(req.body.columns || []);

    let statisticsHTML = `
        <html>

        <head>
            <title>Statistics Summary</title>
        </head>

        <body>

        <h1>Statistics Summary</h1>

        <table border="1" cellpadding="10">

        <tr>
            <th>Column</th>
            <th>Average</th>
            <th>Minimum</th>
            <th>Maximum</th>
        </tr>
    `;

    selectedColumns.forEach((column) =>
    {
        const numbers = results

        .map((row) =>
        {
            return Number(row[column]);
        })

        .filter((value) =>
        {
            return !isNaN(value);
        });

        if(numbers.length > 0)
        {
            const sum = numbers.reduce((a, b) => a + b, 0);

            const average = sum / numbers.length;

            const minimum = Math.min(...numbers);

            const maximum = Math.max(...numbers);

            statisticsHTML += `
                <tr>
                    <td>${column}</td>
                    <td>${average.toFixed(2)}</td>
                    <td>${minimum}</td>
                    <td>${maximum}</td>
                </tr>
            `;
        }
    });

    statisticsHTML += `
        </table>

        <br><br>

        <h2>CSV Data</h2>

        <table border="1" cellpadding="10">

        <tr>
    `;

    const columns = Object.keys(results[0]);

    columns.forEach((column) =>
    {
        statisticsHTML += `<th>${column}</th>`;
    });

    statisticsHTML += `</tr>`;

    results.forEach((row) =>
    {
        statisticsHTML += `<tr>`;

        columns.forEach((column) =>
        {
            statisticsHTML += `<td>${row[column]}</td>`;
        });

        statisticsHTML += `</tr>`;
    });

    statisticsHTML += `
        </table>

        </body>

        </html>
    `;

    res.send(statisticsHTML);
});

app.listen(3000, () =>
{
    console.log("Server running on port 3000");
});