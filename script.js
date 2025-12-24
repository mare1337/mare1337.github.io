const mapWrapper = document.getElementById("mapWrapper");
const mapContainer = document.getElementById("mapContainer");
const mapImg = document.getElementById("mapImg");
const zoomSlider = document.getElementById("zoomSlider");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");

mapImg.ondragstart = () => false;

let zoom = 1;
let originX = 0;
let originY = 0;
let initialZoom = 1;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragThreshold = 3;

let pins = JSON.parse(localStorage.getItem("pins") || "[]");
pins.forEach(placePin);

/* -------------------------
        DRAGGING
------------------------- */
mapWrapper.addEventListener("mousedown", e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

mapWrapper.addEventListener("mousemove", e => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;

    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
        originX += dx;
        originY += dy;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        limitBounds();
        updateTransform();
    }
});

mapWrapper.addEventListener("mouseup", e => isDragging = false);
mapWrapper.addEventListener("mouseleave", e => isDragging = false);

/* -------------------------
   ZOOMING
------------------------- */
mapWrapper.addEventListener("wheel", e => {
    e.preventDefault();
    const scaleAmount = e.deltaY * -0.0015;
    const oldZoom = zoom;

    zoom = Math.min(3, Math.max(initialZoom, zoom + scaleAmount));

    const rect = mapWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wx = (mouseX - originX) / oldZoom;
    const wy = (mouseY - originY) / oldZoom;

    originX = mouseX - wx * zoom;
    originY = mouseY - wy * zoom;

    limitBounds();
    updateTransform();
    zoomSlider.value = zoom;
});

/* -------------------------
   SLIDER & BUTTONS
------------------------- */
zoomIn.onclick = () => changeZoom(0.1);
zoomOut.onclick = () => changeZoom(-0.1);

zoomSlider.oninput = function() {
    setZoom(parseFloat(this.value));
};

function changeZoom(delta) {
    const centerX = mapWrapper.clientWidth / 2;
    const centerY = mapWrapper.clientHeight / 2;
    setZoom(zoom + delta, centerX, centerY);
}

function setZoom(newZoom, cx = mapWrapper.clientWidth / 2, cy = mapWrapper.clientHeight / 2) {
    const oldZoom = zoom;
    zoom = Math.min(3, Math.max(initialZoom, newZoom));

    const wx = (cx - originX) / oldZoom;
    const wy = (cy - originY) / oldZoom;

    originX = cx - wx * zoom;
    originY = cy - wy * zoom;

    limitBounds();
    updateTransform();
    zoomSlider.value = zoom;
}

/* -------------------------
   INITIAL ZOOM / SLIDER
------------------------- */
window.addEventListener("load", () => {
    const wrapperWidth = mapWrapper.clientWidth;
    const wrapperHeight = mapWrapper.clientHeight;
    const imgWidth = mapImg.width;
    const imgHeight = mapImg.height;

    const zoomX = wrapperWidth / imgWidth;
    const zoomY = wrapperHeight / imgHeight;
    initialZoom = Math.min(zoomX, zoomY);
    zoom = initialZoom;

    originX = (wrapperWidth - imgWidth * zoom) / 2;
    originY = (wrapperHeight - imgHeight * zoom) / 2;

    updateTransform();

    zoomSlider.min = initialZoom;
    zoomSlider.max = 3;
    zoomSlider.step = 0.01;
    zoomSlider.value = initialZoom;
});

/* -------------------------
   UPDATE & LIMIT FUNCTIONS
------------------------- */
function limitBounds() {
    const mapWidth = mapImg.width * zoom;
    const mapHeight = mapImg.height * zoom;

    const minX = mapWrapper.clientWidth - mapWidth;
    const minY = mapWrapper.clientHeight - mapHeight;

    originX = Math.min(0, Math.max(minX, originX));
    originY = Math.min(0, Math.max(minY, originY));

    if (mapWidth < mapWrapper.clientWidth) originX = (mapWrapper.clientWidth - mapWidth) / 2;
    if (mapHeight < mapWrapper.clientHeight) originY = (mapWrapper.clientHeight - mapHeight) / 2;
}

function updateTransform() {
    mapContainer.style.transform = `translate(${originX}px, ${originY}px) scale(${zoom})`;
}

/* -------------------------
   PIN FUNCTIONS
------------------------- */
function placePin(pin) {
    const pinEl = document.createElement("div");
    pinEl.className = "pin";
    pinEl.style.left = `${pin.x}px`;
    pinEl.style.top = `${pin.y}px`;
    pinEl.style.background = pin.color;

    if (pin.link) {
        pinEl.onclick = e => {
            e.stopPropagation();
            window.open(pin.link, "_blank");
        };
    }

    pinEl.addEventListener("contextmenu", e => {
        e.preventDefault();
        openPinEditPrompt(pinEl);
    });

    const labelEl = document.createElement("div");
    labelEl.className = "label";
    labelEl.textContent = pin.label;
    labelEl.style.left = `${pin.x}px`;
    labelEl.style.top = `${pin.y - 20}px`;

    mapContainer.appendChild(pinEl);
    mapContainer.appendChild(labelEl);
}

function savePins() {
    localStorage.setItem("pins", JSON.stringify(pins));
}

/* -------------------------
   CONTEXT MENU / MODAL
------------------------- */
mapWrapper.addEventListener("contextmenu", e => {
    e.preventDefault();
    const targetPin = e.target.closest(".pin");
    if (targetPin) {
        showPinMenu(e.clientX, e.clientY, targetPin);
    } else {
        showMapMenu(e.clientX, e.clientY);
    }
});

function showMapMenu(x, y) {
    removeExistingMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    const createPinBtn = document.createElement("button");
    createPinBtn.textContent = "Create Pin";
    createPinBtn.onclick = () => {
        removeExistingMenu();
        openPinPrompt(x, y);
    };
    menu.appendChild(createPinBtn);
    document.body.appendChild(menu);
    positionMenu(menu, x, y);
}

function showPinMenu(x, y, pinEl) {
    removeExistingMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";

    const customizeBtn = document.createElement("button");
    customizeBtn.textContent = "Customize Pin";
    customizeBtn.onclick = () => {
        removeExistingMenu();
        openPinEditPrompt(pinEl);
    };

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove Pin";
    removeBtn.style.background = "rgba(255, 0, 0, 0.6)"; // red
    removeBtn.onclick = () => {
        removeExistingMenu();
        const index = Array.from(mapContainer.querySelectorAll(".pin")).indexOf(pinEl);
        if (index > -1) {
            pins.splice(index, 1);
            savePins();
            pinEl.remove();
            const labelEl = mapContainer.querySelectorAll(".label")[index];
            if (labelEl) labelEl.remove();
        }
    };

    menu.appendChild(customizeBtn);
    menu.appendChild(removeBtn);
    document.body.appendChild(menu);
    positionMenu(menu, x, y);
}

function positionMenu(menu, x, y) {
    const menuRect = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width - 10;
    if (top + menuRect.height > window.innerHeight) top = window.innerHeight - menuRect.height - 10;
    menu.style.left = left + "px";
    menu.style.top = top + "px";
}

function removeExistingMenu() {
    const existing = document.querySelector(".context-menu");
    if (existing) existing.remove();
}

function openPinPrompt(mouseX, mouseY) {
    const modal = document.createElement("div");
    modal.className = "context-menu";
    modal.style.left = "50%";
    modal.style.top = "50%";
    modal.style.transform = "translate(-50%, -50%)";

    const labelInput = document.createElement("input");
    labelInput.placeholder = "Pin label";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#0084ff";
    const linkInput = document.createElement("input");
    linkInput.placeholder = "Optional link";

    const btnContainer = document.createElement("div");
    btnContainer.className = "modal-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.className = "save";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => {
        const rect = mapImg.getBoundingClientRect();
        const x = (mouseX - rect.left) / zoom;
        const y = (mouseY - rect.top) / zoom;
        const pin = { x, y, label: labelInput.value || "Pin", color: colorInput.value, link: linkInput.value };
        pins.push(pin);
        savePins();
        placePin(pin);
        modal.remove();
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => modal.remove();

    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);
    modal.appendChild(labelInput);
    modal.appendChild(colorInput);
    modal.appendChild(linkInput);
    modal.appendChild(btnContainer);

    document.body.appendChild(modal);
}

function openPinEditPrompt(pinEl) {
    const index = Array.from(mapContainer.querySelectorAll(".pin")).indexOf(pinEl);
    if (index === -1) return;
    const pin = pins[index];

    const modal = document.createElement("div");
    modal.className = "context-menu";
    modal.style.left = "50%";
    modal.style.top = "50%";
    modal.style.transform = "translate(-50%, -50%)";

    const labelInput = document.createElement("input");
    labelInput.value = pin.label;
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = pin.color;
    const linkInput = document.createElement("input");
    linkInput.value = pin.link;

    const btnContainer = document.createElement("div");
    btnContainer.className = "modal-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.className = "save";
    saveBtn.textContent = "Save";
    saveBtn.onclick = () => {
        pin.label = labelInput.value || pin.label;
        pin.color = colorInput.value;
        pin.link = linkInput.value;
        savePins();
        location.reload();
        modal.remove();
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => modal.remove();

    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);
    modal.appendChild(labelInput);
    modal.appendChild(colorInput);
    modal.appendChild(linkInput);
    modal.appendChild(btnContainer);

    document.body.appendChild(modal);
}
