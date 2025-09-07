import app from "./app";
import { APP_PORT } from "./utils/secret"

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});