'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Button,
  Container,
  Grid
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/system';
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        setIsFirstRound(currentInput.toLowerCase() === 'yes');
        break;
      case 4:
        if (!['yes', 'no'].includes(currentInput.toLowerCase())) {
          setMessages([...newMessages, { 
            text: 'Please answer with yes or no', 
            type: 'system' as const 
          }]);
          setCurrentInput('');
          return;
        }
        setIsLastRound(currentInput.toLowerCase() === 'yes');
        break;
    }

    // Move to next question if available
    if (currentQuestion < questions.length - 1) {
      newMessages.push({ text: questions[currentQuestion + 1], type: 'question' as const });
      setCurrentQuestion(prev => prev + 1);
    }

    // Send analysis request when all questions are answered
    if (currentQuestion === questions.length - 1) {
      try {
        const response = await axios.post('http://localhost:8000/analyze', {
          Position: titlePosition,
          Education: education,
          Number_of_Investor: investorCount,
          IsFirst: isFirstRound,
          IsLast: currentInput.toLowerCase() === 'yes',
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: false
        });
        setResult(response.data);
        await fetchHistory();
      } catch (error) {
        console.error('Error during analysis:', error);
      }
    }

    setMessages(newMessages);
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
    fetchHistory();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    // Calculate percentage (constrain between 30% and 70%)
    const newLeftWidth = Math.min(Math.max((mouseX / containerWidth) * 100, 30), 70);
    setLeftWidth(newLeftWidth);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      py: 4
    }}>
      <Container maxWidth="xl">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3,
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box
            ref={containerRef}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              position: 'relative',
              height: '100%'
            }}
          >
            {/* Left side - Chat Interface */}
            <Box
              sx={{
                width: `${leftWidth}%`,
                height: '100%',
                pr: 2,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
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
                  <Box sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Messages Area */}
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

                    {/* Input Area - Fixed at Bottom */}
                    <Box 
                      sx={{
                        borderTop: 1,
                        borderColor: 'divider',
                        pt: 2,
                        backgroundColor: 'background.paper',
                        position: 'sticky',
                        bottom: 0,
                        width: '100%'
                      }}
                    >
                      <Box 
                        component="form" 
                        onSubmit={handleInputSubmit} 
                        sx={{ 
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: 2
                        }}
                      >
                        <TextField
                          fullWidth
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          placeholder="Type your answer..."
                          size="medium"
                          sx={{
                            flexGrow: 1,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px'
                            }
                          }}
                        />
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 2,
                          flexShrink: 0,
                          width: { xs: '100%', sm: 'auto' }
                        }}>
                          <Button 
                            type="submit" 
                            variant="contained"
                            sx={{
                              minWidth: '100px',
                              height: '40px',
                              borderRadius: '8px',
                              flexGrow: { xs: 1, sm: 0 }
                            }}
                          >
                            Send
                          </Button>
                          {currentQuestion === questions.length - 1 && (
                            <Button 
                              variant="outlined" 
                              onClick={handleReset}
                              sx={{
                                minWidth: '140px',
                                height: '40px',
                                borderRadius: '8px',
                                flexGrow: { xs: 1, sm: 0 }
                              }}
                            >
                              New Analysis
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 200px)'
                  }}>
                    {history.length === 0 ? (
                      <Typography variant="body1" color="text.secondary" align="center">
                        No analysis history available.
                      </Typography>
                    ) : (
                      history.map((item: HistoryItem, index: number) => (
                        <Paper 
                          key={`${item.timestamp}-${index}`}
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
                                style={{ width: '100%', height: 'auto' }}
                              />
                            </Box>
                          )}
                        </Paper>
                      ))
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Resizer */}
            <Box
              sx={{
                position: 'absolute',
                left: `${leftWidth}%`,
                top: 0,
                bottom: 0,
                width: '10px',
                transform: 'translateX(-50%)',
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                '&:hover': {
                  '&::after': {
                    backgroundColor: 'primary.main',
                  }
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'divider',
                  transition: 'background-color 0.2s'
                },
                '@media (pointer: coarse)': {
                  width: '20px',
                  '&::after': {
                    width: '6px',
                  }
                }
              }}
              onMouseDown={handleMouseDown}
            />

            {/* Right side - Results */}
            <Box
              sx={{
                width: `${100 - leftWidth}%`,
                height: '100%',
                pl: 2,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Typography variant="h5" gutterBottom>
                  UNet++ Predictive Result
                </Typography>
                {result && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto',
                    py: 2
                  }}>
                    {result.image && (
                      <Box sx={{
                        width: '100%',
                        minHeight: '300px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        p: 3,
                        boxShadow: 1
                      }}>
                        <img
                          src={result.image}
                          alt="Analysis Result"
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '500px',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                        />
                      </Box>
                    )}
                    {result.message && (
                      <Box sx={{
                        p: 4,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 1,
                        textAlign: 'center'
                      }}>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 600,
                            color: 'primary.main',
                            mb: 2
                          }}
                        >
                          {result.message}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}