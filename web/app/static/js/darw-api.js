

function upload() {
  // Example data URL image
  data = document.getElementById("img");
  var dataUrl = data.src;

  // Extract base64 data from data URL
  var base64Data = dataUrl.split(",")[1];

  // Decode base64 data into binary string
  var binaryString = atob(base64Data);

  // Convert binary string to Blob object
  var blob = new Blob([binaryString], { type: "image/png" });

  // Create FormData object and add Blob to it
  var formData = new FormData();
  formData.append("image", blob, "image.png");

  // Send AJAX request to server
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/upload", true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      console.log("Image uploaded successfully.");
    } else {
      console.error("Error uploading image:", xhr.statusText);
    }
  };
  xhr.onerror = function () {
    console.error("Error uploading image:", xhr.statusText);
  };
  xhr.send(formData);
}
