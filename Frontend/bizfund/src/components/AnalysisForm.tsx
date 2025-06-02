'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Container,
  Paper,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/system';
import type { GridProps } from '@mui/material';
import axios from 'axios';

interface AnalysisResult {
  image: string;
  message: string;
}

interface HistoryItem {
  image: string;
  message: string;
  timestamp: string;
  input_data: {
    Position: string;
    Number_of_Investor: number;
    IsFirst: boolean;
    IsLast: boolean;
    Education: string;
  };
}

interface Message {
  text: string;
  type: 'question' | 'answer' | 'system';
}

const questions = [
  'What is your title/position?',
  'What is your highest education level?',
  'How many investors are involved?',
  'Is this the first investment round? (yes/no)',
  'Is this the last investment round? (yes/no)',
];

export default function AnalysisForm() {
  const [titlePosition, setTitlePosition] = useState('');
  const [education, setEducation] = useState('');
  const [investorCount, setInvestorCount] = useState<number>(0);
  const [isFirstRound, setIsFirstRound] = useState<boolean | null>(null);
  const [isLastRound, setIsLastRound] = useState<boolean | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Add initial question
    if (messages.length === 0) {
      setMessages([{ text: questions[0], type: 'question' as const }]);
    }

    // Load history
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:8000/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    // Add user's answer to messages
    const newMessages = [...messages, { text: currentInput, type: 'answer' as const }];

    // Process the answer based on current question
    switch (currentQuestion) {
      case 0:
        setTitlePosition(currentInput);
        break;
      case 1:
        setEducation(currentInput);
        break;
      case 2:
        const num = parseInt(currentInput);
        if (isNaN(num) || num < 0) {
          setMessages([...newMessages, { 
            text: 'Please enter a valid number of investors (0 or greater)', 
            type: 'system' as const 
          }]);
          setCurrentInput('');
          return;
        }
        setInvestorCount(num);
        break;
      case 3:
        if (!['yes', 'no'].includes(currentInput.toLowerCase())) {
          setMessages([...newMessages, { 
            text: 'Please answer with yes or no', 
            type: 'system' as const 
          }]);
          setCurrentInput('');
          return;
        }
        const isFirst = currentInput.toLowerCase() === 'yes';
        setIsFirstRound(isFirst);
        
        if (!isFirst) {
          // Only ask about last round if it's not the first round
          newMessages.push({ text: questions[4], type: 'question' as const });
          setMessages(newMessages);
          setCurrentQuestion(4);
        } else {
          // If it's the first round, set isLastRound to false and proceed to analysis
          setIsLastRound(false);
          setMessages([...newMessages, { text: 'Processing your answers...', type: 'system' as const }]);
          setIsAnalyzing(true);
          try {
            const response = await axios.post('http://localhost:8000/analyze', {
              Position: titlePosition,
              Education: education,
              Number_of_Investor: investorCount,
              IsFirst: true,
              IsLast: false,
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
              withCredentials: false
            });
            setResult(response.data);
            setMessages(prev => [...prev, { text: 'Analysis complete!', type: 'system' as const }]);
            // Fetch updated history after successful analysis
            await fetchHistory();
          } catch (error) {
            console.error('Error during analysis:', error);
            setMessages(prev => [...prev, { text: 'Error during analysis. Please try again.', type: 'system' as const }]);
          }
        }
        setCurrentInput('');
        return;
      case 4:
        if (!['yes', 'no'].includes(currentInput.toLowerCase())) {
          setMessages([...newMessages, { 
            text: 'Please answer with yes or no', 
            type: 'system' as const 
          }]);
          setCurrentInput('');
          return;
        }
        const isLast = currentInput.toLowerCase() === 'yes';
        setIsLastRound(isLast);
        // Proceed to analysis immediately after getting last round answer
        setMessages([...newMessages, { text: 'Processing your answers...', type: 'system' as const }]);
        setIsAnalyzing(true);
        try {
          const response = await axios.post('http://localhost:8000/analyze', {
            Position: titlePosition,
            Education: education,
            Number_of_Investor: investorCount,
            IsFirst: false,
            IsLast: isLast,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: false
          });
          setResult(response.data);
          setMessages(prev => [...prev, { text: 'Analysis complete!', type: 'system' as const }]);
          // Fetch updated history after successful analysis
          await fetchHistory();
        } catch (error) {
          console.error('Error during analysis:', error);
          setMessages(prev => [...prev, { text: 'Error during analysis. Please try again.', type: 'system' as const }]);
        }
        setCurrentInput('');
        return;
    }

    // Move to next question for cases 0, 1 and 2 only
    if (currentQuestion < 3) {
      newMessages.push({ text: questions[currentQuestion + 1], type: 'question' as const });
      setMessages(newMessages);
      setCurrentQuestion(prev => prev + 1);
    }

    setCurrentInput('');
  };

  const handleReset = () => {
    setTitlePosition('');
    setEducation('');
    setInvestorCount(0);
    setIsFirstRound(null);
    setIsLastRound(null);
    setCurrentQuestion(0);
    setMessages([{ text: questions[0], type: 'question' as const }]);
    setCurrentInput('');
    setResult(null);
    setIsAnalyzing(false);
    // Fetch updated history when resetting
    fetchHistory();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        {/* Left side - Chat Interface */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Interactive Analysis</Typography>
              <Button 
                variant="outlined" 
                onClick={() => setShowHistory(!showHistory)}
                size="small"
              >
                {showHistory ? 'Hide History' : 'Show History'}
              </Button>
            </Box>
            {!showHistory ? (
              <>
                <Box sx={{ 
                  flexGrow: 1, 
                  overflowY: 'auto', 
                  mb: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}>
                  {messages.map((message, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        maxWidth: '80%',
                        alignSelf: message.type === 'answer' ? 'flex-end' : 'flex-start',
                        bgcolor: message.type === 'question' 
                          ? 'primary.light'
                          : message.type === 'answer'
                          ? 'secondary.light'
                          : 'grey.300',
                        color: message.type === 'question' || message.type === 'answer' 
                          ? 'white' 
                          : 'text.primary'
                      }}
                    >
                      <Typography>{message.text}</Typography>
                    </Box>
                  ))}
                </Box>
                {!isAnalyzing && (
                  <Box component="form" onSubmit={handleInputSubmit} sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Type your answer..."
                      size="small"
                    />
                    <Button type="submit" variant="contained">
                      Send
                    </Button>
                  </Box>
                )}
                {isAnalyzing && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button variant="outlined" onClick={handleReset}>
                      Start New Analysis
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {history.length === 0 ? (
                  <Typography variant="body1" color="text.secondary" align="center">
                    No analysis history available.
                  </Typography>
                ) : (
                  history.map((item, index) => (
                    <Paper 
                      key={item.timestamp} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {new Date(item.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Position: {item.input_data.Position}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Education: {item.input_data.Education}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Investors: {item.input_data.Number_of_Investor}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        First Round: {item.input_data.IsFirst ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Last Round: {item.input_data.IsLast ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {item.message}
                      </Typography>
                      {item.image && (
                        <Box sx={{ mt: 2 }}>
                          <img
                            src={item.image}
                            alt="Analysis Result"
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                        </Box>
                      )}
                    </Paper>
                  ))
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right side - Results */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, minHeight: '400px' }}>
            <Typography variant="h5" gutterBottom>
              Analysis Results
            </Typography>
            {result ? (
              <Box>
                {result.image && (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={result.image}
                      alt="Analysis Result"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </Box>
                )}
                {result.message && (
                  <Typography variant="body1">{result.message}</Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                {isAnalyzing ? 'Analyzing...' : 'Please answer all questions to see the analysis results.'}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 