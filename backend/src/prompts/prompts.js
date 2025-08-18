export const messageToJSON = (messages) => {
 const prompt = `You are an expert Jira ticket creator. Based on the following conversation between two developers, 
create a valid JSON object representing a Jira ticket with the following fields: summary, description, issueType 
(choose from Bug, Task, Story).
Ensure the JSON is properly formatted.
 
Here is a template for the JSON object:

 {
   "summary": "",
   "description": "",
   "issuetype": "",
 }
       
 Conversation:    
 ${messages.map(msg => msg.text).join('\n')}
`;
    
  return prompt;
}