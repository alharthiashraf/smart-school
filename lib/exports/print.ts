export function printElement(id: string) {
  const content = document.getElementById(id);

  if (!content) return;

  const win = window.open("", "_blank");

  if (!win) return;

  win.document.write(`
<html>

<head>

<title>Print</title>

</head>

<body>

${content.innerHTML}

</body>

</html>
`);

  win.document.close();

  win.focus();

  win.print();

  win.close();
}
