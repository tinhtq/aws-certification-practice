// DOM Elements
const importBtn = document.getElementById('importBtn');
const jsonFileInput = document.getElementById('jsonFile');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const progressInfo = document.getElementById('progressInfo');
const questionContainer = document.getElementById('questionContainer');
const resultContainer = document.getElementById('resultContainer');
const summaryContainer = document.getElementById('summaryContainer');
const questionNumber = document.getElementById('questionNumber');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('options');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const explanation = document.getElementById('explanation');
const continueBtn = document.getElementById('continueBtn');
const timer = document.getElementById('timer');
const correctCount = document.getElementById('correctCount');
const incorrectCount = document.getElementById('incorrectCount');
const accuracy = document.getElementById('accuracy');
const timeSpent = document.getElementById('timeSpent');
const restartBtn = document.getElementById('restartBtn');
const reviewBtn = document.getElementById('reviewBtn');
const showSampleBtn = document.getElementById('showSampleBtn');
const sampleJson = document.getElementById('sampleJson');
const jsonFormat = document.getElementById('jsonFormat');

// Application state
let questions = [];
let availableQuestionIndices = []; // Track available questions for random selection
let currentQuestionIndex = 0;
let selectedOptionIndices = []; // Changed from selectedOptionIndex to support multiple selections
let correctAnswers = 0;
let incorrectAnswers = 0;
let incorrectQuestions = [];
let startTime = null;
let totalTime = 0;
let timerInterval = null;
let isReviewMode = false;

// Initialize the application
function init() {
    loadQuestionsFromLocalStorage();
    setupEventListeners();
    displaySampleJsonFormat();
}

// Load questions from local storage if available
function loadQuestionsFromLocalStorage() {
    const savedQuestions = localStorage.getItem('awsDataEngineerQuestions');
    if (savedQuestions) {
        questions = JSON.parse(savedQuestions);
        updateProgressInfo();
        enableButtons();
    }
}

// Set up event listeners
function setupEventListeners() {
    importBtn.addEventListener('click', importQuestions);
    startBtn.addEventListener('click', startPractice);
    resetBtn.addEventListener('click', resetProgress);
    submitBtn.addEventListener('click', submitAnswer);
    nextBtn.addEventListener('click', showNextQuestion);
    continueBtn.addEventListener('click', continueAfterExplanation);
    restartBtn.addEventListener('click', restartPractice);
    reviewBtn.addEventListener('click', reviewIncorrectQuestions);
    showSampleBtn.addEventListener('click', toggleSampleJson);
}

// Import questions from JSON file
function importQuestions() {
    const file = jsonFileInput.files[0];
    if (!file) {
        alert('Please select a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedQuestions = JSON.parse(e.target.result);
            if (Array.isArray(importedQuestions) && importedQuestions.length > 0) {
                // Validate questions format
                const validQuestions = importedQuestions.filter(q => {
                    // Check if question has required fields
                    if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
                        return false;
                    }
                    
                    // Check correctAnswer format
                    if (Array.isArray(q.correctAnswer)) {
                        // Multiple choice - validate all indices are valid
                        return q.correctAnswer.length > 0 && 
                               q.correctAnswer.every(idx => typeof idx === 'number' && idx >= 0 && idx < q.options.length);
                    } else {
                        // Single choice - validate index is valid
                        return typeof q.correctAnswer === 'number' && 
                               q.correctAnswer >= 0 && 
                               q.correctAnswer < q.options.length;
                    }
                });
                
                if (validQuestions.length < importedQuestions.length) {
                    alert(`Warning: ${importedQuestions.length - validQuestions.length} questions were skipped due to invalid format.`);
                }
                
                questions = validQuestions;
                localStorage.setItem('awsDataEngineerQuestions', JSON.stringify(questions));
                updateProgressInfo();
                enableButtons();
                alert(`Successfully imported ${questions.length} questions`);
            } else {
                alert('Invalid JSON format. Please check the file structure.');
            }
        } catch (error) {
            alert('Error parsing JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Update progress information
function updateProgressInfo() {
    progressInfo.textContent = `${questions.length} questions loaded`;
}

// Enable buttons after questions are loaded
function enableButtons() {
    startBtn.disabled = false;
    resetBtn.disabled = false;
}

// Start the practice session
function startPractice() {
    // Reset counters and state
    correctAnswers = 0;
    incorrectAnswers = 0;
    incorrectQuestions = [];
    isReviewMode = false;
    
    // Initialize available question indices for random selection
    availableQuestionIndices = Array.from(Array(questions.length).keys());
    
    startTimer();
    showRandomQuestion();
    
    questionContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    summaryContainer.classList.add('hidden');
}

// Get a random question from the available questions
function showRandomQuestion() {
    // If no more questions are available, show summary
    if (availableQuestionIndices.length === 0) {
        showSummary();
        return;
    }
    
    // Select a random index from the available questions
    const randomIndex = Math.floor(Math.random() * availableQuestionIndices.length);
    currentQuestionIndex = availableQuestionIndices[randomIndex];
    
    // Remove this index from available questions to avoid repetition
    availableQuestionIndices.splice(randomIndex, 1);
    
    // Show the selected question
    showQuestion();
}

// Reset progress and clear local storage
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This will clear all imported questions.')) {
        localStorage.removeItem('awsDataEngineerQuestions');
        questions = [];
        progressInfo.textContent = 'No questions loaded';
        startBtn.disabled = true;
        resetBtn.disabled = true;
        questionContainer.classList.add('hidden');
        resultContainer.classList.add('hidden');
        summaryContainer.classList.add('hidden');
        stopTimer();
    }
}

// Display the current question
function showQuestion() {
    const question = questions[currentQuestionIndex];
    questionNumber.textContent = `Question ${availableQuestionIndices.length + 1 < questions.length ? questions.length - availableQuestionIndices.length : 1}/${questions.length}`;
    questionText.textContent = question.question;
    
    // Clear previous options
    optionsContainer.innerHTML = '';
    
    // Add options - handle any number of options (2, 3, 4, etc.)
    if (question.options && Array.isArray(question.options)) {
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            
            // Check if this is a multiple-choice question
            const isMultipleChoice = Array.isArray(question.correctAnswer);
            
            // Create checkbox or radio button based on question type
            const inputElement = document.createElement('input');
            inputElement.type = isMultipleChoice ? 'checkbox' : 'radio';
            inputElement.name = 'question-option';
            inputElement.id = `option-${index}`;
            inputElement.value = index;
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `option-${index}`;
            labelElement.textContent = option;
            
            optionElement.appendChild(inputElement);
            optionElement.appendChild(labelElement);
            optionElement.dataset.index = index;
            optionElement.addEventListener('click', selectOption);
            optionsContainer.appendChild(optionElement);
        });
        
        // Add a note if it's a multiple-choice question
        if (Array.isArray(question.correctAnswer) && question.correctAnswer.length > 1) {
            const noteElement = document.createElement('div');
            noteElement.className = 'multiple-choice-note';
            noteElement.textContent = 'Select all that apply';
            optionsContainer.appendChild(noteElement);
        }
    }
    
    selectedOptionIndices = []; // Reset selected options
    submitBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    
    // Clear any previous explanation
    explanation.textContent = '';
}

// Handle option selection
function selectOption(event) {
    const question = questions[currentQuestionIndex];
    const isMultipleChoice = Array.isArray(question.correctAnswer);
    
    // Find the clicked option element (might be the div, input, or label)
    let optionElement = event.target;
    while (!optionElement.classList.contains('option') && optionElement.parentElement) {
        optionElement = optionElement.parentElement;
    }
    
    // Get the input element
    const inputElement = optionElement.querySelector('input');
    if (!inputElement) return;
    
    const optionIndex = parseInt(optionElement.dataset.index);
    
    if (isMultipleChoice) {
        // Toggle checkbox
        inputElement.checked = !inputElement.checked;
        
        // Update selected options array
        if (inputElement.checked) {
            if (!selectedOptionIndices.includes(optionIndex)) {
                selectedOptionIndices.push(optionIndex);
            }
            optionElement.classList.add('selected');
        } else {
            selectedOptionIndices = selectedOptionIndices.filter(index => index !== optionIndex);
            optionElement.classList.remove('selected');
        }
    } else {
        // Single choice - radio button behavior
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.remove('selected');
            option.querySelector('input').checked = false;
        });
        
        inputElement.checked = true;
        optionElement.classList.add('selected');
        selectedOptionIndices = [optionIndex];
    }
}

// Submit the answer
function submitAnswer() {
    const question = questions[currentQuestionIndex];
    const isMultipleChoice = Array.isArray(question.correctAnswer);
    
    if (selectedOptionIndices.length === 0) {
        alert('Please select an answer');
        return;
    }
    
    const options = document.querySelectorAll('.option');
    let isCorrect = false;
    
    if (isMultipleChoice) {
        // For multiple choice, check if selected options match exactly with correct answers
        const selectedSorted = [...selectedOptionIndices].sort();
        const correctSorted = [...question.correctAnswer].sort();
        
        isCorrect = selectedSorted.length === correctSorted.length && 
                    selectedSorted.every((value, index) => value === correctSorted[index]);
        
        // Mark correct and incorrect options
        options.forEach((option, index) => {
            const isSelected = selectedOptionIndices.includes(index);
            const isCorrectOption = question.correctAnswer.includes(index);
            
            if (isCorrectOption) {
                option.classList.add('correct');
            } else if (isSelected) {
                option.classList.add('incorrect');
            }
        });
    } else {
        // For single choice questions
        const selectedIndex = selectedOptionIndices[0];
        isCorrect = selectedIndex === question.correctAnswer;
        
        // Mark correct and incorrect options
        options.forEach((option, index) => {
            if (index === question.correctAnswer) {
                option.classList.add('correct');
            } else if (index === selectedIndex) {
                option.classList.add('incorrect');
            }
        });
    }
    
    // Update score
    if (isCorrect) {
        correctAnswers++;
    } else {
        incorrectAnswers++;
        incorrectQuestions.push(currentQuestionIndex);
    }
    
    // Show explanation
    explanation.textContent = question.explanation || "No explanation provided.";
    resultContainer.classList.remove('hidden');
    
    // Set up explanation enhancements
    if (window.setupExplanationEnhancements) {
        console.log("Calling setupExplanationEnhancements with:", {
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation || "No explanation provided."
        });
        window.setupExplanationEnhancements(
            question.question,
            question.options,
            question.correctAnswer,
            question.explanation || "No explanation provided."
        );
    } else {
        console.error("setupExplanationEnhancements function not found in window object");
    }
    
    // Hide submit button and show next button
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
}

// Show the next question
function showNextQuestion() {
    resultContainer.classList.add('hidden');
    
    if (isReviewMode) {
        if (incorrectQuestions.length > 0) {
            currentQuestionIndex = incorrectQuestions.shift();
            showQuestion();
        } else {
            showSummary();
        }
    } else {
        showRandomQuestion();
    }
}

// Continue after showing explanation
function continueAfterExplanation() {
    resultContainer.classList.add('hidden');
    showNextQuestion();
}

// Show practice summary
function showSummary() {
    stopTimer();
    
    questionContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    summaryContainer.classList.remove('hidden');
    
    correctCount.textContent = correctAnswers;
    incorrectCount.textContent = incorrectAnswers;
    
    const totalAnswered = correctAnswers + incorrectAnswers;
    const accuracyValue = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    accuracy.textContent = `${accuracyValue}%`;
    
    timeSpent.textContent = formatTime(totalTime);
    
    if (incorrectAnswers === 0) {
        reviewBtn.disabled = true;
    } else {
        reviewBtn.disabled = false;
    }
}

// Restart the practice
function restartPractice() {
    startPractice();
}

// Review incorrect questions
function reviewIncorrectQuestions() {
    if (incorrectQuestions.length === 0) {
        alert('No incorrect questions to review');
        return;
    }
    
    isReviewMode = true;
    currentQuestionIndex = incorrectQuestions.shift();
    
    showQuestion();
    questionContainer.classList.remove('hidden');
    summaryContainer.classList.add('hidden');
    
    startTimer();
}

// Start the timer
function startTimer() {
    startTime = new Date();
    totalTime = 0;
    updateTimer();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(updateTimer, 1000);
}

// Update the timer display
function updateTimer() {
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    totalTime = elapsedSeconds;
    timer.textContent = formatTime(elapsedSeconds);
}

// Stop the timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Toggle sample JSON format display
function toggleSampleJson() {
    if (sampleJson.classList.contains('hidden')) {
        sampleJson.classList.remove('hidden');
        showSampleBtn.textContent = 'Hide Sample JSON Format';
    } else {
        sampleJson.classList.add('hidden');
        showSampleBtn.textContent = 'Show Sample JSON Format';
    }
}

// Display sample JSON format
function displaySampleJsonFormat() {
    const sampleFormat = [
        {
            "question": "What is the primary purpose of Amazon Redshift?",
            "options": [
                "A. NoSQL database for high-throughput applications",
                "B. Data warehousing and analytics",
                "C. In-memory caching service",
                "D. Document database for web applications"
            ],
            "correctAnswer": 1,
            "explanation": "Amazon Redshift is a fully managed, petabyte-scale data warehouse service designed for analytics workloads."
        },
        {
            "question": "Which AWS services can be used for real-time data processing? (Select TWO)",
            "options": [
                "A. Amazon Kinesis",
                "B. Amazon S3",
                "C. Amazon Lambda",
                "D. Amazon RDS"
            ],
            "correctAnswer": [0, 2],
            "explanation": "Amazon Kinesis and AWS Lambda are both suitable for real-time data processing. Kinesis is designed for streaming data, while Lambda can process data in real-time through event-driven functions."
        }
    ];
    
    jsonFormat.textContent = JSON.stringify(sampleFormat, null, 2);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
