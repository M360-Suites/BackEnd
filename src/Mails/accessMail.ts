import fs from "fs";
import path from "path";
import handlebars from "handlebars";

interface Props {
  firstName: string;
  accountName: string;
  invitor: string;
  accessUrl: string;
}

export const accountAccessMail = ({ firstName, invitor, accountName, accessUrl }: Props) => {
  // Read Template
  const htmlTemplate = fs.readFileSync(
    path.join(__dirname, "..", "public", "mail", "accountAccess.html"),
    "utf-8"
  );

  // Compile Templates
  const template = handlebars.compile(htmlTemplate);

  // Generate final HTML content
  const htmlContent = template({ firstName, invitor, accountName, accessUrl });

  return htmlContent;
};
