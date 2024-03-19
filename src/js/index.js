import 'emoji-picker-element';
import insertTextAtCursor from 'insert-text-at-cursor';
import { isWebShareSupported } from '@georapbox/web-share-element/dist/is-web-share-supported.js';
import '@georapbox/web-share-element/dist/web-share-defined.js';
import '@georapbox/capture-photo-element/dist/capture-photo-defined.js';
import '@georapbox/modal-element/dist/modal-element-defined.js';
import '@georapbox/files-dropzone-element/dist/files-dropzone-defined.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/main.css';
import { uid } from './utils/uid.js';
import { fileFromUrl } from './utils/file-from-url.js';
import { storage } from './utils/storage.js';
import { ACCEPTED_MIME_TYPES } from './constants.js';
import { customFonts, loadCustomFont } from './custom-fonts.js';
import { toastAlert } from './toast-alert.js';
import { createTextBox } from './create-text-box.js';
import { drawCanvas } from './draw-canvas.js';

const videoModal = document.getElementById('videoModal');
const downloadModal = document.getElementById('downloadModal');
const canvas = document.getElementById('canvas');
const dropzoneEl = document.querySelector('files-dropzone');
const instructionsEl = document.getElementById('instructions');
const ctx = canvas.getContext('2d');
const imageUploadMethodSelect = document.getElementById('imageUploadMethodSelect');
const fileSelectBtn = document.getElementById('fileSelectBtn');
const imageUrlForm = document.getElementById('imageUrlForm');
const addTextboxBtn = document.getElementById('addTextboxBtn');
const inputsContainer = document.getElementById('inputsContainer');
const generateMemeBtn = document.getElementById('generateMemeBtn');
const openVideoModalBtn = document.getElementById('openVideoModalBtn');
const downloadMemeBtn = document.getElementById('downloadMemeBtn');
const downloadMemePreview = document.getElementById('downloadMemePreview');
const webShareComponent = document.querySelector('web-share');
const galleryEl = document.getElementById('gallery');
const gallerySearchEl = document.getElementById('gallerySearch');
const galleryNoResultsEl = galleryEl.querySelector('.gallery__no-results');
const solidColorForm = document.getElementById('solidColorForm');
const uploadMethodEls = document.querySelectorAll('.upload-method');
const removeConfirmationModal = document.getElementById('removeConfirmationModal');
const removeTextForm = document.getElementById('removeTextForm');
const maxImageDimensionsForm = document.getElementById('maxImageDimensionsForm');
const maxImageDimensionsSelect = maxImageDimensionsForm['maxImageDimensions'];
const maxImageDimensionsFromStorage = storage.get('maxImageDimensions');
let selectedImage = null;
let reqAnimFrame = null;

const defaultTextOptions = {
  text: '',
  fillColor: '#ffffff',
  strokeColor: '#000000',
  font: 'Pressuru',
  fontSize: 40,
  fontWeight: 'normal',
  textAlign: 'center',
  shadowBlur: 3,
  borderWidth: 1,
  offsetY: 0,
  offsetX: 0,
  rotate: 0,
  allCaps: true
};

const textOptions = new Map([
  [uid(), { ...defaultTextOptions }]
]);

const generateMeme = async () => {
  const dataUrl = canvas.toDataURL('image/png');

  // Prepare download link
  const downloadLink = dataUrl.replace('image/png', 'image/octet-stream');
  downloadMemeBtn.download = `${uid('meme')}.png`;
  downloadMemeBtn.href = downloadLink;
  downloadMemePreview.width = canvas.width;
  downloadMemePreview.height = canvas.height;
  downloadMemePreview.src = downloadLink;

  // Prepare for sharing file
  if (isWebShareSupported()) {
    try {
      const file = await fileFromUrl({
        url: dataUrl,
        filename: `${uid('meme')}.png`,
        mimeType: 'image/png'
      }).catch(err => toastAlert(err.message, 'danger'));

      if (file && isWebShareSupported({ files: [file] })) {
        webShareComponent.shareFiles = [file];
        webShareComponent.hidden = false;
      }
    } catch (error) {
      console.error(error);
    }
  }

  window.requestAnimationFrame(() => {
    downloadModal.open = true;
  });
};

const setImageMaxDimensions = image => {
  const maxImageDimensionsSelect = maxImageDimensionsForm['maxImageDimensions'];
  const [maxWidthValue, maxHeightValue] = maxImageDimensionsSelect.value.split('x');
  const MAX_WIDTH = Number(maxWidthValue) || 800;
  const MAX_HEIGHT = Number(maxHeightValue) || 600;
  let width = image.width;
  let height = image.height;

  if (width > height) {
    if (width > MAX_WIDTH) {
      height *= MAX_WIDTH / width;
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width *= MAX_HEIGHT / height;
      height = MAX_HEIGHT;
    }
  }

  canvas.width = width;
  canvas.height = height;
};

const onImageLoaded = evt => {
  selectedImage = evt.target;
  setImageMaxDimensions(selectedImage);
  drawCanvas(selectedImage, canvas, ctx, textOptions);
  dropzoneEl.classList.add('dropzone--accepted');
  generateMemeBtn.disabled = false;
  canvas.hidden = false;
  instructionsEl.hidden = true;
};

const removeText = id => {
  textOptions.delete(id);

  const textBoxEl = document.getElementById(id);
  textBoxEl && textBoxEl.remove();

  inputsContainer.querySelectorAll('[data-section="textBox"]').forEach((el, idx) => {
    el.querySelector('[data-input="text"]').setAttribute('placeholder', `Text #${idx + 1}`);
  });

  drawCanvas(selectedImage, canvas, ctx, textOptions);
};

const handleSolidColorFormInput = evt => {
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 600;

  if (evt.target === solidColorForm['canvasColor']) {
    selectedImage = evt.target.value;
  }

  if (typeof selectedImage === 'string') {
    canvas.width = Number(solidColorForm['canvasWidth'].value) || DEFAULT_WIDTH;
    canvas.height = Number(solidColorForm['canvasHeight'].value) || DEFAULT_HEIGHT;

    drawCanvas(selectedImage, canvas, ctx, textOptions);

    dropzoneEl.classList.add('dropzone--accepted');
    generateMemeBtn.disabled = false;
    canvas.hidden = false;
    instructionsEl.hidden = true;
  }
};

const handleFileSelect = file => {
  if (!file) {
    return;
  }

  const image = new Image();
  const reader = new FileReader();

  reader.addEventListener('load', function (evt) {
    const data = evt.target.result;
    image.addEventListener('load', onImageLoaded);
    image.src = data;
  });

  reader.readAsDataURL(file);
};

const handleOpenVideoModalButtonClick = () => {
  videoModal.open = true;
};

const handleTextPropChange = (element, textBoxId, prop) => {
  if (element.type === 'checkbox') {
    textOptions.get(textBoxId)[prop] = element.checked;
  } else if (element.type === 'number') {
    textOptions.get(textBoxId)[prop] = Number(element.value);
  } else {
    textOptions.get(textBoxId)[prop] = element.value;
  }

  drawCanvas(selectedImage, canvas, ctx, textOptions);
};

const handleAddTextboxBtnClick = () => {
  const textBoxId = uid();
  const newTextBox = createTextBox(textBoxId, defaultTextOptions);

  textOptions.set(textBoxId, { ...defaultTextOptions });
  inputsContainer.appendChild(newTextBox);
  newTextBox.querySelector('[data-input="text"]').focus();
};

const handleImageUploadFromURL = async evt => {
  evt.preventDefault();

  const form = evt.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const imageUrl = form['imageUrl'].value;

  if (!imageUrl.trim()) {
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector('.spinner').hidden = false;
  submitButton.querySelector('.label').hidden = true;

  try {
    const file = await fileFromUrl({
      url: imageUrl
    }).catch(err => toastAlert(err.message, 'danger'));

    if (file) {
      handleFileSelect(file);
    }
  } catch (err) {
    toastAlert(`Failed to load image from "${imageUrl}".`, 'danger');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('.spinner').hidden = true;
    submitButton.querySelector('.label').hidden = false;
  }
};

const moveTextUsingArrowbuttons = (textBoxId, direction) => () => {
  const textBoxEl = document.getElementById(textBoxId);
  const offsetYInput = textBoxEl.querySelector('[data-input="offsetY"]');
  const offsetXInput = textBoxEl.querySelector('[data-input="offsetX"]');
  const textOption = textOptions.get(textBoxId);

  if (!textOption) {
    return;
  }

  direction = direction.toLowerCase();

  switch (direction) {
    case 'up':
      textOption.offsetY -= 1;
      offsetYInput.value = textOption.offsetY;
      break;
    case 'down':
      textOption.offsetY += 1;
      offsetYInput.value = textOption.offsetY;
      break;
    case 'left':
      textOption.offsetX -= 1;
      offsetXInput.value = textOption.offsetX;
      break;
    case 'right':
      textOption.offsetX += 1;
      offsetXInput.value = textOption.offsetX;
      break;
  }

  drawCanvas(selectedImage, canvas, ctx, textOptions);

  reqAnimFrame = requestAnimationFrame(moveTextUsingArrowbuttons(textBoxId, direction));
};

const handleUploadMethodChange = evt => {
  uploadMethodEls.forEach(el => el.hidden = el.id !== evt.target.value);
  maxImageDimensionsForm.hidden = evt.target.value === 'solidColorForm';
};

const handleFileSelectClick = () => {
  if (typeof dropzoneEl.openFileDialog === 'function') {
    dropzoneEl.openFileDialog();
  }
};

const handleDropFilesAccepted = evt => {
  const [file] = evt.detail.acceptedFiles;

  if (file) {
    handleFileSelect(file);
  }
};

const handleInputsContainerInput = evt => {
  const element = evt.target;
  const textBoxId = element.closest('[data-section="textBox"]').id;
  let prop;

  if (element.matches('[data-input="text"]')) {
    prop = 'text';
  } else if (element.matches('[data-input="fillColor"]')) {
    prop = 'fillColor';
  } else if (element.matches('[data-input="strokeColor"]')) {
    prop = 'strokeColor';
  } else if (element.matches('[data-input="font"]')) {
    prop = 'font';
  } else if (element.matches('[data-input="fontSize"]')) {
    prop = 'fontSize';
  } else if (element.matches('[data-input="fontWeight"]')) {
    prop = 'fontWeight';
  } else if (element.matches('[data-input="textAlign"]')) {
    prop = 'textAlign';
  } else if (element.matches('[data-input="shadowBlur"]')) {
    prop = 'shadowBlur';
  } else if (element.matches('[data-input="offsetY"]')) {
    prop = 'offsetY';
  } else if (element.matches('[data-input="offsetX"]')) {
    prop = 'offsetX';
  } else if (element.matches('[data-input="rotate"]')) {
    prop = 'rotate';
  } else if (element.matches('[data-input="borderWidth"]')) {
    prop = 'borderWidth';
  }

  if (prop) {
    handleTextPropChange(element, textBoxId, prop);
  }
};

const handleInputsContainerChange = evt => {
  const element = evt.target;
  const textBoxId = element.closest('[data-section="textBox"]').id;
  let prop;

  if (element.matches('[data-input="allCaps"]')) {
    prop = 'allCaps';
  }

  if (prop) {
    handleTextPropChange(element, textBoxId, prop);
  }
};

const handleInputsContainerClick = evt => {
  const element = evt.target;

  if (element.matches('[data-button="settings"]')) {
    const textBoxEl = element.closest('[data-section="textBox"]');
    const textBoxSettingsEl = textBoxEl?.querySelector('[data-section="settings"]');

    if (textBoxSettingsEl) {
      textBoxSettingsEl.hidden = !textBoxSettingsEl.hidden;
    }
  }

  if (element.matches('[data-button="duplicate-text-box"')) {
    const currentTextBoxEl = element.closest('[data-section="textBox"]');
    const currentTextBoxData = textOptions.get(currentTextBoxEl.id);
    const newTextBoxId = uid();

    textOptions.set(newTextBoxId, { ...currentTextBoxData });

    const newTextBoxEl = createTextBox(newTextBoxId, currentTextBoxData);

    inputsContainer.appendChild(newTextBoxEl);
    newTextBoxEl.querySelector('[data-input="text"]').focus();
    drawCanvas(selectedImage, canvas, ctx, textOptions);
  }

  if (element.matches('[data-button="delete-text-box"]')) {
    const textBoxId = element.closest('[data-section="textBox"]').id;
    const textOption = textOptions.get(textBoxId);

    if (textOption && textOption.text.trim()) {
      const textBoxIdInput = removeTextForm['textbox-id'];

      if (textBoxIdInput) {
        textBoxIdInput.value = textBoxId;
        removeConfirmationModal.open = true;
      }
    } else {
      removeText(textBoxId);
    }
  }
};

const handleTextRemoveFormSubmit = evt => {
  evt.preventDefault();
  const textBoxId = evt.target['textbox-id'].value;

  if (textBoxId) {
    removeText(textBoxId);
    removeConfirmationModal.open = false;
  }
};

const handleInputsContainerPointerdown = evt => {
  const element = evt.target;
  const textBoxEl = element.closest('[data-section="textBox"]');

  if (!textBoxEl) {
    return;
  }

  if (element.matches('[data-action="move-text"]')) {
    reqAnimFrame = requestAnimationFrame(moveTextUsingArrowbuttons(textBoxEl.id, element.getAttribute('aria-label')));
  }
};

const handleInputsContainerPointerup = evt => {
  const element = evt.target;

  if (element.matches('[data-action="move-text"]')) {
    cancelAnimationFrame && cancelAnimationFrame(reqAnimFrame);
    reqAnimFrame = null;
  }
};

const handleInputsContainerPointerout = evt => {
  const element = evt.target;

  if (element.matches('[data-action="move-text"]')) {
    cancelAnimationFrame && cancelAnimationFrame(reqAnimFrame);
    reqAnimFrame = null;
  }
};

const handleInputsContainerKeyDown = evt => {
  const element = evt.target;
  const textBoxEl = element.closest('[data-section="textBox"]');

  if (element.matches('[data-action="move-text"]')) {
    if (evt.key === ' ' || evt.key === 'Enter') {
      reqAnimFrame && cancelAnimationFrame(reqAnimFrame);
      reqAnimFrame = requestAnimationFrame(moveTextUsingArrowbuttons(textBoxEl.id, element.getAttribute('aria-label')));
    }
  }
};

const handleInputsContainerKeyUp = evt => {
  const element = evt.target;

  if (element.matches('[data-action="move-text"]')) {
    if (evt.key === ' ' || evt.key === 'Enter') {
      reqAnimFrame && cancelAnimationFrame(reqAnimFrame);
      reqAnimFrame = null;
    }
  }
};

const handleGalleryClick = async evt => {
  const button = evt.target.closest('button');

  if (!button) {
    return;
  }

  const img = button.querySelector('img');

  try {
    const file = await fileFromUrl({
      url: img.src
    }).catch(err => toastAlert(err.message, 'danger'));

    if (file) {
      handleFileSelect(file);
    }
  } catch (err) {
    toastAlert(`Failed to load image: "${img.alt}".`, 'danger');
  }
};

const handleGallerySearchInput = evt => {
  const query = evt.target.value.toLowerCase().trim();
  const galleryItems = galleryEl.querySelectorAll('button');

  galleryItems.forEach(item => {
    const alt = (item.querySelector('img').getAttribute('alt') || '').toLowerCase();
    item.hidden = !alt.includes(query);
  });

  galleryNoResultsEl.hidden = !!galleryEl.querySelector('button:not([hidden])');
};

const handleWebShareError = () => {
  downloadModal.open = false;
  toastAlert('There was an error while trying to share your meme.', 'danger');
};

const handleCapturePhotoError = evt => {
  const error = evt.detail.error;
  let errorMessage = 'An error occurred while trying to capture photo.';

  if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
    errorMessage += ' Make sure you have a camera connected and you have granted the appropriate permissions.';
  }

  toastAlert(errorMessage, 'danger');
  videoModal.open = false;
  console.error(error);
};

const handleCapturePhotoSuccess = evt => {
  videoModal.open = false;
  const image = new Image();
  image.addEventListener('load', onImageLoaded);
  image.src = evt.detail.dataURI;
};

const handleModalOpen = evt => {
  if (evt.target.id === 'videoModal') {
    const capturePhotoComponent = videoModal.querySelector('capture-photo');

    if (capturePhotoComponent && typeof capturePhotoComponent.startVideoStream === 'function') {
      capturePhotoComponent.startVideoStream();
    }
  }
};

const handleModalClose = evt => {
  if (evt.target.id === 'videoModal') {
    const capturePhotoComponent = videoModal.querySelector('capture-photo');

    if (capturePhotoComponent && typeof capturePhotoComponent.stopVideoStream === 'function') {
      capturePhotoComponent.stopVideoStream();
    }
  }

  if (evt.target.id === 'removeConfirmationModal') {
    removeTextForm.reset();
  }
};

const handleEmojiPickerSelection = evt => {
  const textBoxEl = evt.target.closest('[data-section="textBox"]');

  if (textBoxEl) {
    const input = textBoxEl.querySelector('[data-input="text"]');
    const emoji = evt.detail.unicode;

    if (input) {
      insertTextAtCursor(input, emoji);
    }
  }
};

const handleMaxImageDimensionsFormChange = evt => {
  if (evt.target.matches('[name="maxImageDimensions"]')) {
    storage.set('maxImageDimensions', evt.target.value);
  }

  if (!selectedImage || typeof selectedImage === 'string') {
    return;
  }

  setImageMaxDimensions(selectedImage);
  drawCanvas(selectedImage, canvas, ctx, textOptions);
};

fileSelectBtn.addEventListener('click', handleFileSelectClick);
openVideoModalBtn.addEventListener('click', handleOpenVideoModalButtonClick);
addTextboxBtn.addEventListener('click', handleAddTextboxBtnClick);
generateMemeBtn.addEventListener('click', generateMeme);
downloadMemeBtn.addEventListener('click', () => downloadModal.open = false);
imageUrlForm.addEventListener('submit', handleImageUploadFromURL);
dropzoneEl.addEventListener('files-dropzone-drop-accepted', handleDropFilesAccepted);
inputsContainer.addEventListener('input', handleInputsContainerInput);
inputsContainer.addEventListener('change', handleInputsContainerChange);
inputsContainer.addEventListener('click', handleInputsContainerClick);
inputsContainer.addEventListener('pointerdown', handleInputsContainerPointerdown);
inputsContainer.addEventListener('pointerup', handleInputsContainerPointerup);
inputsContainer.addEventListener('pointerout', handleInputsContainerPointerout);
inputsContainer.addEventListener('keydown', handleInputsContainerKeyDown);
inputsContainer.addEventListener('keyup', handleInputsContainerKeyUp);
imageUploadMethodSelect.addEventListener('change', handleUploadMethodChange);
galleryEl.addEventListener('click', handleGalleryClick);
gallerySearchEl.addEventListener('input', handleGallerySearchInput);
solidColorForm.addEventListener('input', handleSolidColorFormInput);
document.addEventListener('web-share:error', handleWebShareError);
document.addEventListener('capture-photo:error', handleCapturePhotoError);
document.addEventListener('capture-photo:success', handleCapturePhotoSuccess);
document.addEventListener('me-open', handleModalOpen);
document.addEventListener('me-close', handleModalClose);
document.addEventListener('emoji-click', handleEmojiPickerSelection);
removeTextForm.addEventListener('submit', handleTextRemoveFormSubmit);
maxImageDimensionsForm.addEventListener('change', handleMaxImageDimensionsFormChange);

galleryEl.querySelectorAll('button > img')?.forEach(image => {
  image.setAttribute('title', image.getAttribute('alt'));
});

textOptions.forEach((value, key) => {
  inputsContainer.appendChild(createTextBox(key, value));
});

dropzoneEl.accept = ACCEPTED_MIME_TYPES;

customFonts.forEach(({ name, path, style, weight }) => {
  loadCustomFont(name, path, { style, weight });
});

if (maxImageDimensionsFromStorage) {
  maxImageDimensionsSelect.value = maxImageDimensionsFromStorage;
}

maxImageDimensionsSelect.disabled = false;
