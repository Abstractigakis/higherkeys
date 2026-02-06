'use server'

export async function callModal(name: string) {
  // TODO: Update the URL to your deployed Modal app URL
  // Example: https://your-username--example-hello-world-hello-dev.modal.run
  const response = await fetch(`https://ericstratigakis--example-hello-world-hello-dev.modal.run?name=${name}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to call Modal endpoint');
  }

  const data = await response.json();
  return data.message;
}

export async function generateImage(prompt: string) {
  // TODO: Update the URL to your deployed Modal app URL
  // Example: https://your-username--sdxl-turbo-model-generate-dev.modal.run
  const response = await fetch(`https://ericstratigakis--sdxl-turbo-model-generate-dev.modal.run?prompt=${encodeURIComponent(prompt)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to generate image');
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}
