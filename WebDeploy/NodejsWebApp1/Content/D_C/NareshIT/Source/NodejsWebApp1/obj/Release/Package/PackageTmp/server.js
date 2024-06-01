'use strict';
const fs = require('fs');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const sql = require('mssql');
const { promisify } = require('util');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON file path for caching
const cacheFilePath = path.join(__dirname, 'questionCache.json');

// SQL Server connection configuration
const sqlConfig = {
    user: 'sa',
    password: 'Password@123',
    server: '49.207.10.13',
    database: 'cmdexamdb',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Connection Pool setup
const pool = new sql.ConnectionPool({
    ...sqlConfig,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
});
pool.connect();
const queryAsync = promisify(pool.query).bind(pool);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get('Images/Naresh_IT_Logo.ico', (req, res) => res.status(200));

app.get('/favicon.ico', (req, res) => res.status(204));

// Set the view engine to EJS and specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Warm-up during application startup
async function warmUp() {
    try {
        await pool.connect();
        const warmUpQuestions = await fetchQuestionsFromCache(5); // Try to fetch from cache first
        console.log('Warm-up complete.');
    } catch (error) {
        console.error('Error during warm-up:', error.message);
    } finally {
        await sql.close();
    }
}

warmUp();

// Routes
app.get('/', (req, res) => {
    res.render('LoginPage');
});
app.post('/testcreatortypes', async (req, res) => {
    try {
        // Extract data from the request
        const assessmentType = req.body.testName;
        const assessmentNature = req.body.testDescription;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;

        // Convert date and time strings to a format compatible with SQL Server
        const formattedStartDate = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
        const formattedEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

        // Use separate variables for time components
        const [startHour, startMinute] = startTime.split(':');
        const [endHour, endMinute] = endTime.split(':');

        // Format time strings with seconds and milliseconds
        const formattedStartTime = `${startHour}:${startMinute}:00.000`;
        const formattedEndTime = `${endHour}:${endMinute}:00.000`;

        // Insert data into the Test table using parameterized query
        const result = await queryAsync(`
    INSERT INTO dbo.Test (TestName, NatureOfTest, TestStartDate, TestEndDate, TestStartTime, TestEndTime) 
    VALUES (@testName, @natureOfTest, @startDate, @endDate, @startTime, @endTime)
`, {
            testName: assessmentType,
            natureOfTest: assessmentNature,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            startTime: formattedStartTime,
            endTime: formattedEndTime
        });

        // Check if the insertion was successful
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log('Test record inserted successfully');

            // Redirect to the next page or send a response as needed
            res.status(200).json({ message: 'Test record inserted successfully.' });
        } else {
            console.error('Failed to insert test record');
            res.status(500).json({ message: 'Failed to insert test record.' });
        }
    } catch (error) {
        console.error('Error processing test creation:', error.message);
        res.status(500).json({ message: 'Error processing test creation.' });
    }
});
app.get('/AdminHomePage', (req, res) => {
    res.render('AdminHomePage', { username: req.query.username });
});

app.get('/testSelection', (req, res) => {
    res.render('TestSelection', { /* Add any variables you want to pass to the view */ });
});

app.get('/testcreator', (req, res) => {
    res.render('testcreator', { /* Add any variables you want to pass to the view */ });
});

app.get('/testcreatortypes', (req, res) => {
    res.render('testcreatortypes', { /* Add any variables you want to pass to the view */ });
});

app.get('/page2', (req, res) => {
    res.render('Page2', { /* Add any variables you want to pass to the view */ });
});


// Route to render a form for the user to input the number of questions
app.get('/selectQuestions', (req, res) => {
    res.render('selectQuestions');
});

app.get('/questionsSelectionViews', (req, res) => {
    res.render('questionSelectionViews'); // Check if the route handler matches the view name
});

app.get('/testviewpage1', (req, res) => {
    res.render('testviewpage1'); // Check if the route handler matches the view name
});
app.get('/listofAssessment', (req, res) => {
    res.render('listofAssessment'); // Check if the route handler matches the view name
});

app.get('/sheduletime', (req, res) => {
    res.render('sheduletime'); // Check if the route handler matches the view name
});

app.get('/UserHomePage', (req, res) => {
    res.render('UserHomePage'); // Check if the route handler matches the view name
});

//app.get('/studentExamPage', (req, res) => {
//    res.render('studentExamPage'); // Check if the route handler matches the view name
//});

app.get('/technology', (req, res) => {
    res.render('technology'); // Check if the route handler matches the view name
});

app.get('/assessment', (req, res) => {
    res.render('assessment'); // Check if the route handler matches the view name
});

// Route to render the exam page with a specific question
app.get('/exam', async (req, res) => {
    const index = parseInt(req.query.index, 10) || 0;
    try {
        const questions = await fetchQuestionsFromCache(1); // Fetch one question at a time
        const currentQuestion = questions[0];
        res.render('examPage', { currentQuestion, currentIndex: index, totalQuestions: questions.length, questions }); // Pass 'questions' variable to the template
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: 'Error fetching questions.' });
    }
});
// Route to render the test creation page
app.get('/testCreationPage', (req, res) => {
    res.render('testCreationPage');
});
app.get('/quesitontreeview', async (req, res) => {
    try {
        const technologies = await fetchTechnologiesWithModulesAndTopics();
        res.render('quesitontreeview', { technologies }); // Make sure to pass the 'technologies' variable here
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ message: 'Error fetching data.' });
    }
});
//quesitontreeview
//app.get('/quesitontreeview', (req, res) => {
//    res.render('quesitontreeview');
//});

// Route for processing the test creation form submission
app.post('/createTest', async (req, res) => {
    try {
        const mcqCount = parseInt(req.body.mcqQuestions, 10);
        const descriptiveQuestionsCount = parseInt(req.body.descriptiveQuestions, 10);
        const matchingQuestionsCount = parseInt(req.body.matchingQuestions, 10);

        // Fetch questions for each type from the database
        const mcqQuestions = await fetchQuestionsFromDatabase1('MCQQuestionALL1', mcqQuestionsCount);
        const descriptiveQuestions = await fetchQuestionsFromDatabase1('DescriptiveQuestion', descriptiveQuestionsCount);
        const matchingQuestions = await fetchQuestionsFromDatabase1('MatchingQuestions', matchingQuestionsCount);

        // Render the test creation page with the selected questions
        res.render('questionDisplay', { mcqQuestions, descriptiveQuestions, matchingQuestions });
    } catch (error) {
        console.error('Error fetching questions:   ', error.message);
        res.status(500).json({ message: 'Error fetching questions.    ' });
    }
});// Route to render the question selection page
app.get('/questionSelection', (req, res) => {
    res.render('questionSelection');
});


// Route for processing the question selection form submission
app.post('/createTest', async (req, res) => {
    try {
        const mcqQuestionsCount = parseInt(req.body.mcqQuestions, 10);
        const descriptiveQuestionsCount = parseInt(req.body.descriptiveQuestions, 10);
        const matchingQuestionsCount1 = parseInt(req.body.matchingQuestions, 10);

        // Render the question display page with the selected counts
        res.render('questionDisplay', {
            mcqQuestionsCount,
            descriptiveQuestionsCount,
            matchingQuestionsCount1,
        });
    } catch (error) {
        console.error('Error processing question selection:', error.message);
        res.status(500).json({ message: 'Error processing question selection.' });
    }
});
app.get('/exam', async (req, res) => {
    const index = parseInt(req.query.index, 10) || 0;
    try {
        const questions = await fetchQuestionsFromCache(1); // Fetch one question at a time
        const currentQuestion = questions[0];
        res.render('examPage', { currentQuestion, currentIndex: index, totalQuestions: questions.length, questions }); // Pass 'questions' variable to the template
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: 'Error fetching questions.' });
    }
});
app.get('/fetchTechnologies', async (req, res) => {
    try {
        const technologies = await fetchTechnologiesFromDatabase();
        res.json(technologies);
    } catch (error) {
        console.error('Error fetching technologies:', error.message);
        res.status(500).json({ message: 'Error fetching technologies.' });
    }
});
app.get('/treeview', async (req, res) => {
    try {
        // Fetch data from the database (replace with your actual methods)
        const technologies = await fetchTechnologiesWithModulesAndTopics();

        // Render the treeview page with the data
        res.render('treeview', { technologies });
    } catch (error) {
        console.error('Error fetching treeview data:', error.message);
        res.status(500).json({ message: 'Error fetching treeview data.' });
    }
});
app.get('/fetchModules/:technologyId', async (req, res) => {
    const technologyId = req.params.technologyId;
    try {
        const modules = await fetchModulesFromDatabase(technologyId);
        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error.message);
        res.status(500).json({ message: 'Error fetching modules.' });
    }
});

// Route to fetch topics based on the selected module
app.get('/fetchTopics/:moduleId', async (req, res) => {
    const moduleId = req.params.moduleId;
    try {
        const topics = await fetchTopicsFromDatabase(moduleId);
        res.json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Error fetching topics.' });
    }
});

// Route to fetch subtopics based on the selected topic
app.get('/fetchSubtopics/:topicId', async (req, res) => {
    const topicId = req.params.topicId;
    try {
        const subtopics = await fetchSubtopicsFromDatabase(topicId);
        res.json(subtopics);
    } catch (error) {
        console.error('Error fetching subtopics:', error.message);
        res.status(500).json({ message: 'Error fetching subtopics.' });
    }
});
app.get('/api/getQuestionCounts/:questionTypeId', async (req, res) => {
    try {
        const testId = 1;
        const questionTypeId = req.params.questionTypeId;

        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT Q.TypeName, T.NumOfEasy, T.NumOfMedium, T.NumOfHard 
            FROM TestDetails T 
            INNER JOIN QuestionTypes Q ON T.QuestionTypeID = Q.QuestionTypeID 
            WHERE T.TestID = ${testId} AND T.QuestionTypeID = ${questionTypeId}
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    } finally {
        sql.close();
    }
});
// Route for processing the form submission and fetching questions from the database
app.post('/createTest', async (req, res) => {
    try {
        const mcqQuestionsCount = parseInt(req.body.mcqQuestions, 10);
        const descriptiveQuestionsCount = parseInt(req.body.descriptiveQuestions, 10);
        const matchingQuestionsCount = parseInt(req.body.matchingQuestions, 10);
        const selectionQuestionsCount = parseInt(req.body.checkboxSelections, 10);
        // Fetch questions for each type from the database
        const mcqQuestions = await fetchQuestionsFromDatabase1('MCQQuestionALL1', mcqQuestionsCount);
        const descriptiveQuestions = await fetchQuestionsFromDatabase1('DescriptiveQuestion', descriptiveQuestionsCount);
        const matchingQuestions = await fetchQuestionsFromDatabase1('MatchingQuestions', matchingQuestionsCount);
        const selectionsQuestions = await fetchQuestionsFromDatabase1('MCQQuestionALL', selectionQuestionsCount);

        // Render the test creation page with the selected questions
        res.render('questionDisplay', { mcqQuestions, descriptiveQuestions, matchingQuestions, checkboxSelections });
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: 'Error fetching questions.' });
    }
});
async function fetchQuestionsFromDatabase1(tableName, numberOfQuestions) {
    try {
        console.log(`Fetching questions from table: ${tableName}`);
        const result = await queryAsync(`SELECT TOP 1000 * FROM dbo.MCQQuestionALL1 ORDER BY NEWID()`);
        const questions = result.recordset;
        return questions;
    } catch (error) {
        console.error(`Error fetching questions from the database: tablename ${tableName} ${error.message}`);
        throw new Error(`Error fetching questions from the database:  tablename ${error.message}`);
    } finally {
        await sql.close();
    }
}
async function fetchTechnologiesFromDatabase() {
    try {
        const result = await queryAsync('SELECT * FROM dbo.Technologies');
        const technologies = result.recordset;
        return technologies;
    } catch (error) {
        console.error(`Error fetching technologies from the database: ${error.message}`);
        throw new Error('Error fetching technologies from the database.');
    } finally {
        await sql.close();
    }
}

// Function to fetch a specific number of questions from cache or the database
async function fetchQuestionsFromCache(numberOfQuestions) {
    try {
        // Try to fetch from cache first
        const cachedQuestions = readFromCache();
        if (cachedQuestions && cachedQuestions.length >= numberOfQuestions) {
            const selectedQuestions = cachedQuestions.slice(0, numberOfQuestions);
            return selectedQuestions;
        }

        // Fetch the remaining questions from the database
        const remainingQuestions = numberOfQuestions - (cachedQuestions ? cachedQuestions.length : 0);
        const dbQuestions = await fetchQuestionsFromDatabase(remainingQuestions);

        // Update cache with combined questions
        const combinedQuestions = [...(cachedQuestions || []), ...dbQuestions];
        updateCache(combinedQuestions);

        return combinedQuestions;
    } catch (error) {
        throw new Error(`Error fetching questions: ${error.message}`);
    }
}

// Function to read questions from the local cache
function readFromCache() {
    try {
        if (fs.existsSync(cacheFilePath)) {
            const cacheData = fs.readFileSync(cacheFilePath, 'utf-8');
            return JSON.parse(cacheData);
        }
        return null;
    } catch (error) {
        console.error('Error reading from cache:', error.message);
        return null;
    }
}

// Function to update the local cache with new questions
function updateCache(questions) {
    try {
        const cacheData = JSON.stringify(questions);
        fs.writeFileSync(cacheFilePath, cacheData, 'utf-8');
    } catch (error) {
        console.error('Error updating cache:', error.message);
    }
}
// Add these functions to your server.js

// Function to fetch modules based on the selected technology
async function fetchModulesFromDatabase(technologyId) {
    try {
        const result = await queryAsync(`SELECT * FROM dbo.Modules WHERE TechnologyID = ${technologyId}`);
        const modules = result.recordset;
        return modules;
    } catch (error) {
        console.error(`Error fetching modules from the database: ${error.message}`);
        throw new Error('Error fetching modules from the database.');
    } finally {
        await sql.close();
    }
}

// Function to fetch topics based on the selected module
async function fetchTopicsFromDatabase(moduleId) {
    try {
        const result = await queryAsync(`SELECT * FROM dbo.Topics WHERE ModuleID = ${moduleId}`);
        const topics = result.recordset;
        return topics;
    } catch (error) {
        console.error(`Error fetching topics from the database: ${error.message}`);
        throw new Error('Error fetching topics from the database.');
    } finally {
        await sql.close();
    }
}

// Function to fetch subtopics based on the selected topic

async function fetchSubtopicsFromDatabase(topicId) {
    try {
        const result = await queryAsync(`SELECT * FROM dbo.SubTopic WHERE TopicID = ${topicId}`);
        const subtopics = result.recordset;
        return subtopics;
    } catch (error) {
        console.error(`Error fetching subtopics from the database: ${error.message}`);
        throw new Error('Error fetching subtopics from the database.');
    } finally {
        await sql.close();
    }
}
// Function to fetch a specific number of questions from the database
async function fetchQuestionsFromDatabase1(tableName, numberOfQuestions) {
    try {
        console.log(`Fetching questions from table: ${tableName}`);
        const result = await queryAsync(`SELECT TOP ${numberOfQuestions} * FROM dbo.${tableName} ORDER BY NEWID()`);
        const questions = result.recordset;
        return questions;
    } catch (error) {
        console.error(`Error fetching questions from the database: tablename ${tableName} ${error.message}`);
        throw new Error(`Error fetching questions from the database:  tablename ${error.message}`);
    } finally {
        await sql.close();
    }
}

async function fetchTechnologiesWithModulesAndTopics() {
    try {
        const technologiesResult = await queryAsync('SELECT * FROM dbo.Technologies');
        const technologies = technologiesResult.recordset;

        for (const tech of technologies) {
            const modulesResult = await queryAsync(`SELECT * FROM dbo.Modules WHERE TechnologyID = ${tech.TechnologyID}`);
            tech.modules = modulesResult.recordset;

            for (const module of tech.modules) {
                const topicsResult = await queryAsync(`SELECT * FROM dbo.Topics WHERE ModuleID = ${module.ModuleID}`);
                module.topics = topicsResult.recordset;

                for (const topic of module.topics) {
                    const subtopicsResult = await queryAsync(`SELECT * FROM dbo.SubTopic WHERE TopicID = ${topic.TopicID}`);
                    topic.subtopics = subtopicsResult.recordset;
                }
            }
        }

        return technologies;
    } catch (error) {
        console.error('Error fetching technologies with modules and topics:', error.message);
        throw new Error('Error fetching technologies with modules and topics.');
    }
}

const executeGetTestQuestions = async (testID) => {
    try {
        // Assuming you already have the pool defined in your code
        const pool = await sql.connect(sqlConfig);

        // Execute the stored procedure
        const result = await pool.request()
            .input('InputTestID', sql.Int, testID)
            .execute('GetTestQuestions'); // Replace with the actual name of your stored procedure

        // Process the result as needed
        const questions = result.recordset;
        console.log('Fetched questions:', questions);

        return questions; // Return the fetched questions
    } catch (error) {
        console.error('Error executing stored procedure:', error.message);
        throw new Error('Error executing stored procedure.');
    } finally {
        // Close the SQL connection
        await sql.close();
    }
};

// Modify your route handler to fetch questions and render the EJS template
app.get('/studentExamPage', async (req, res) => {
    const testID = 4; // Replace with the actual test ID you want to fetch questions for

    try {
        // Fetch questions using the executeGetTestQuestions function
        const questions = await executeGetTestQuestions(testID);
        console.log('Fetched questions in route handler:', questions);

        // Render the EJS template and pass the questions variable
        res.render('studentExamPage', { questions });
    } catch (error) {
        console.error('Error fetching questions:', error.message);
        res.status(500).json({ message: 'Error fetching questions.' });
    }
});

// Create an HTTP server and pass the Express app as a request listener
const server = http.createServer(app);

// Start Server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
