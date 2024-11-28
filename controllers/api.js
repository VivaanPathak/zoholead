const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { storeTokens, getTokens } = require('../models/api');

// Function to generate a refresh token
const generateRefreshToken = async () => {
    try {
        const options = {
            url: 'https://accounts.zoho.in/oauth/v2/token',
            method: 'post',
            params: {
                grant_type: 'authorization_code',
                code: '1000.e0deb8cd6289d436ebe9ce391f1cdd00.76224cb51372df7f353a6a2c13bb9e26',
                client_id: '1000.HM1QR79IJPIFL1CLB0IHT7QT884ICI',
                redirect_uri: 'https://show.keyss.in/devsos/v1/zoho/auth',
                client_secret: '16331b868bb97e463f85080b29c0410aafb50fee2f',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        };
        const response = await axios(options);
        const refreshToken = response.data.refresh_token;

        const currentTime = new Date();
        await storeTokens(refreshToken, currentTime);
        return refreshToken;
    } catch (error) {
        console.error("Error generating refresh token:", error.response ? error.response.data : error);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

// Function to generate a new access token using the refresh token
const generateAccessToken = async (refreshToken) => {
    try {
        const options = {
            url: 'https://accounts.zoho.in/oauth/v2/token',
            method: 'post',
            params: {
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                client_id: '1000.HM1QR79IJPIFL1CLB0IHT7QT884ICI',
                client_secret: '16331b868bb97e463f85080b29c0410aafb50fee2f',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        };
        const response = await axios(options);
        const accessToken = response.data.access_token;

        const currentTime = new Date();
        await storeTokens(refreshToken, accessToken, currentTime);

        return accessToken;
    } catch (error) {
        console.error("Error generating access token:", error.response ? error.response.data : error);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

// Function to check if the access token is expired (older than 55 minutes)
const isTokenExpired = (lastUpdated) => {
    const currentTime = new Date();
    const tokenTime = new Date(lastUpdated);
    const minutesDifference = (currentTime - tokenTime) / (1000 * 60);
    return minutesDifference > 55;
};

// Function to get a valid access token (refreshes if expired)
const getValidAccessToken = async () => {
    let tokens = await getTokens();

    if (!tokens || !tokens.refresh_token) {
        return await generateRefreshToken();
    }

    if (tokens.access_token && !isTokenExpired(tokens.last_updated)) {
        return tokens.access_token;
    }

    return await generateAccessToken(tokens.refresh_token);
};

// Helper function to get the latest file from a directory
const getLatestFileFromDirectory = (directoryPath) => {
    const files = fs.readdirSync(directoryPath);
    if (!files.length) {
        throw new Error("No files found in the directory.");
    }
    // Sort by modification time, descending (newest first)
    files.sort((a, b) => {
        return fs.statSync(path.join(directoryPath, b)).mtime.getTime() -
               fs.statSync(path.join(directoryPath, a)).mtime.getTime();
    });
    return path.join(directoryPath, files[0]); // Return the latest file
};

// Function to add an attachment to a Zoho CRM lead
const addAttachmentToZohoCRMLead = async (leadId, filePath) => {
    try {
        const accessToken = await getValidAccessToken();  // Ensure valid token

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post(
            `https://www.zohoapis.in/crm/v2/Leads/${leadId}/Attachments`,
            form,
            {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    ...form.getHeaders(),
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error adding attachment to Zoho CRM lead:", error.response ? error.response.data : error);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

// Updated function to add lead with attachment
const addLeadToZohoCRM = async (lead, filePath) => {
    try {
        const accessToken = await getValidAccessToken();  // Ensure valid token

        const leadData = {
            data: [{
                Company: lead.Company,
                Last_Name: lead.Last_Name,
                First_Name: lead.First_Name,
                Email: lead.Email,
                Phone: lead.Phone,
                Mobile: lead.Mobile,
                State: lead.State,
                Description: lead.Description,
            }],
            trigger: ['approval', 'workflow', 'blueprint'],
        };

        // Create the lead in Zoho CRM
        const response = await axios.post(
            'https://www.zohoapis.in/crm/v2/Leads',
            leadData,
            { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
        );

        // Get the lead ID from the response
        const leadId = response.data.data[0].details.id;

        // Add attachment to the lead if a file path is provided
        if (filePath) {
            await addAttachmentToZohoCRMLead(leadId, filePath);
        }

        return response.data;
    } catch (error) {
        console.error("Error adding lead to Zoho CRM:", error.response ? error.response.data : error);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

// Controller action to handle adding a lead with an attachment
const handleAddLead = async (req, res) => {
    try {
        // Extract fields from the request body and handle undefined values
        const lead = {
            Company: req.body.company || null,
            Last_Name: req.body.lastName || null,
            First_Name: req.body.firstName || null,
            Email: req.body.email || null,
            Phone: req.body.phone || null,
            Mobile: req.body.mobile || null,
            State: req.body.state || null,
            Description: req.body.description || null,
        };

        // Get the file path for the attachment (if any)
        // const filePath = req.file ? req.file.path : null;
        //  const filePath = path.resolve('E:/nodejs/zohocrmlead2withdb/controllers/asdf.mp4');
        

        const directoryPath = path.resolve(__dirname, '../uploads');

        // Get the latest file from the directory
        const filePath = getLatestFileFromDirectory(directoryPath);

        // Add the lead to Zoho CRM
        const zohoResponse = await addLeadToZohoCRM(lead, filePath);

        // Ensure `zohoResponse` exists before accessing its data
        if (zohoResponse) {
            res.status(200).json(zohoResponse);
        } else {
            throw new Error('Failed to receive response from Zoho CRM');
        }
    } catch (error) {
        console.error('Error adding lead:', error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    handleAddLead,
};