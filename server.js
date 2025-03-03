const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// "public" folder কে static directory হিসেবে serve করা হবে
app.use(express.static("public"));

// Server Start
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
