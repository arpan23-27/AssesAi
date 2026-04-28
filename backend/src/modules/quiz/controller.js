//src/modules/quiz/controller.js

const quizService = require('./service');

async function startSession(req, res, next){
    try {
        const userId = req.user.sub;
        const { technologyId, difficulty} = req.body;
        const result  = await quizService.startSession({ userId, technologyId, difficulty});
        res.status(201).json(result);   
    }
    catch(err){
        next(err);
        
    }
}

async function submitAnswer(req, res, next) {
    try {
        const userId = req.user.sub;
        const sessionId = req.params.id;
        const {questionId, answerIndex } = req.body;
        const result = await quizService.submitAnswer({sessionId, userId, questionId, answerIndex});
        res.status(200).json(result);
    }  catch(err){
        next(err);
    }
}

async function completeSession(req, res, next){
    try{
        const userId = req.user.sub;
        const sessionId = req.params.id;
        const { correctCount, totalQuestions } = req.body;
        const result = await quizService.completeSession({ sessionId, userId, correctCount, totalQuestions});
        res.status(200).json(result);
    } catch(err){
        next(err);
    }
}

module.exports = { startSession, submitAnswer, completeSession};
