document.addEventListener("DOMContentLoaded", async () => {
  const elements = document.querySelectorAll(".fade-in-element");
  elements.forEach(el => el.classList.add("visible"));

  try {
    await requireAuth();
  } catch (e) { return; }

  const form = document.getElementById("create-form");
  const titleInput = document.getElementById("title");
  const categorySelect = document.getElementById("category");
  const descInput = document.getElementById("description");
  const goalInput = document.getElementById("goal");
  const imageInput = document.getElementById("image");
  const uploadArea = document.getElementById("upload-area");
  const uploadPlaceholder = document.getElementById("upload-placeholder");
  const imagePreview = document.getElementById("image-preview");
  const removeImageBtn = document.getElementById("remove-image");
  const submitBtn = document.getElementById("submit-btn");

  let selectedFile = null;

  // Click to upload
  uploadArea.addEventListener("click", (e) => {
    if (e.target === removeImageBtn) return;
    imageInput.click();
  });

  // File selected
  imageInput.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
      handleFileSelect(imageInput.files[0]);
    }
  });

  // Drag & drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  function handleFileSelect(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Допустимые форматы: JPEG, PNG, GIF, WebP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Файл слишком большой. Максимум 5 МБ', 'error');
      return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = "block";
      removeImageBtn.style.display = "inline-block";
      uploadPlaceholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  // Remove image
  removeImageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedFile = null;
    imageInput.value = "";
    imagePreview.style.display = "none";
    removeImageBtn.style.display = "none";
    uploadPlaceholder.style.display = "flex";
  });

  // Clear field errors on input
  [titleInput, categorySelect, descInput, goalInput].forEach(input => {
    input.addEventListener('input', () => clearFieldError(input));
    input.addEventListener('change', () => clearFieldError(input));
  });

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const description = descInput.value.trim();
    const goal = Number(goalInput.value);

    let hasError = false;

    if (!title) {
      showFieldError(titleInput, 'Укажите название проекта');
      hasError = true;
    }
    if (!category) {
      showFieldError(categorySelect, 'Выберите категорию');
      hasError = true;
    }
    if (!description) {
      showFieldError(descInput, 'Добавьте описание проекта');
      hasError = true;
    }
    if (!goal || goal <= 0) {
      showFieldError(goalInput, 'Цель должна быть больше нуля');
      hasError = true;
    }

    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Создаём...';

    try {
      // Upload image first if selected
      let imgUrl = '';
      if (selectedFile) {
        const uploadRes = await uploadImage(selectedFile);
        if (uploadRes.success) {
          imgUrl = uploadRes.data.url;
        } else {
          showToast(uploadRes.error || 'Ошибка загрузки изображения', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Создать проект';
          return;
        }
      }

      const res = await api('projects.create', {
        method: 'POST',
        body: { title, category, description, goal, img: imgUrl }
      });

      if (res.success) {
        showToast(res.message || 'Проект создан!');
        setTimeout(() => {
          window.location.href = '../user_projects/index.html';
        }, 1500);
      } else {
        showToast(res.error || 'Ошибка создания проекта', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Создать проект';
      }
    } catch (err) {
      showToast('Ошибка соединения с сервером', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Создать проект';
    }
  });
});
