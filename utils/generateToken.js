import jwt from 'jsonwebtoken'; //installed
import dotenv from 'dotenv';
dotenv.config(); 

const genarateToken = (userId) => {
    return jwt.sign({id: userId},
        process.env.JWT_SECRET,
        {
        expiresIn: "1d",
    });
};

export default genarateToken;


// //     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)

// Token 

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjlmNzA3NWIxZWM3Y2FmYjYxNjgwYSIsImlhdCI6MTc0NzU4MDY4MCwiZXhwIjoxNzUwMTcyNjgwfQ.JAYB5D2B5sh7no8O1RNZHCaqHOR9fbU-GLmaEsWJpUI

// Preview URL: https://ethereal.email/message/aCn3CS84OG9VRz.daCn3DIqbCKL3zj0JAAAAAYG5FlfQiL1CLeuhG91H9AU