const input = document.getElementById("imageInput");
const preview = document.getElementById("preview");

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
    }
});

function uploadImage() {
    const file = input.files[0];

    if (!file) {
        alert("Please select an image first!");
        return;
    }

    document.getElementById("result").innerText = "Processing...";

    // Dummy result for now
    setTimeout(() => {
        document.getElementById("result").innerText = "Result: FAKE";
    }, 1000);
}