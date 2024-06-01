
    document.getElementById('logoutButton').addEventListener('click', () => {
        // Clear the session storage
        sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');

    // Redirect to the login page
    window.location.href = '/'; // Replace '/login' with the actual login page URL
});
    function setupUserInfo() {
        // Extract username and token from sessionStorage
        const username = sessionStorage.getItem('username');
    const token = sessionStorage.getItem('token');

    // Check if username and token are available
    if (!username || !token) {
        // Redirect to the login page
        window.location.href = '/'; // Adjust the login page URL as needed
    return;
        }

    // Display the username
    document.getElementById('adminUsername').innerText = `Welcome, ${username}!`;

    console.log('Token:', token);

    // const username = 'your_username';

    fetch(`/getimage/${username}`, {
        method: 'GET',
    headers: {
        'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
})
  .then((response) => response.json())
  .then((data) => {
    // Check if the response contains the image data
    if (data && data.Image) {
      // Convert the binary data to Base64
      const base64Image = arrayBufferToBase64(data.Image);

    // Set the Base64 string as the src attribute of the img element
    document.getElementById('profilePicture').src = `data:image/jpeg;base64,${base64Image}`;
    }
  })
  .catch((error) => console.error('Error fetching image:', error));


   }
    function arrayBufferToBase64(buffer) {
    if (!buffer || !Array.isArray(buffer.data) || buffer.data.length === 0) {
        console.error('Invalid buffer structure:', buffer);
    return null;
    }

    const binaryString = String.fromCharCode.apply(null, buffer.data);
    const base64String = btoa(binaryString);

    return base64String;
}





    function navigateToPage(page) {
        window.location.href = page;
    }

    // Call the setupUserInfo function when the page is loaded
    document.addEventListener('DOMContentLoaded', setupUserInfo);
