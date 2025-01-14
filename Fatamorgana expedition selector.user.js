// ==UserScript==
// @name         Fatamorgana expedition selector
// @namespace    https://phost.dev/
// @version      1.0
// @description  Highlight next move and expedition route selector functionality.
// @author       phost
// @downloadURL  https://github.com/2phost/mh-helpers/raw/refs/heads/main/Fatamorgana%20expedition%20selector.user.js
// @updateURL    https://github.com/2phost/mh-helpers/raw/refs/heads/main/Fatamorgana%20expedition%20selector.user.js
// @match        https://myhordes.eu/*
// @match        https://fatamorgana.md26.eu/*
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

(function () {
    'use strict';

    // Utility to wait for an element
    function waitForElement(selector, callback) {
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                callback(element);
            }
        }, 100); // Check every 100ms
    }

    // ** MyHordes Functionality **

    // Function to parse the movement string
    function parseMovementString(movementString) {
        const rawCoords = movementString.split('_').filter(coord => coord).map(pair => {
            const [x, y] = pair.split('-').map(Number);
            return { x, y };
        });

        const fullPath = [];
        for (let i = 0; i < rawCoords.length - 1; i++) {
            const start = rawCoords[i];
            const end = rawCoords[i + 1];

            if (fullPath.length === 0 || (fullPath[fullPath.length - 1].x !== start.x || fullPath[fullPath.length - 1].y !== start.y)) {
                fullPath.push({ x: start.x, y: start.y });
            }

            let currentX = start.x;
            let currentY = start.y;

            while (currentX !== end.x || currentY !== end.y) {
                if (currentX < end.x) currentX++;
                else if (currentX > end.x) currentX--;

                if (currentY < end.y) currentY++;
                else if (currentY > end.y) currentY--;

                if (fullPath.length === 0 || (fullPath[fullPath.length - 1].x !== currentX || fullPath[fullPath.length - 1].y !== currentY)) {
                    fullPath.push({ x: currentX, y: currentY });
                }
            }
        }

        return fullPath;
    }

    // Highlight the next move
    function highlightNextMove(movementString, townX, townY) {
        const movementCoords = parseMovementString(movementString);

        // Wait for the current location element
        waitForElement('.current-location', (currentLocationDiv) => {
            let currentLocationMatch = currentLocationDiv.textContent.match(/Position: (-?\d+) \/ (-?\d+)/);
            if (!currentLocationMatch) {
                console.error("Failed to extract current coordinates.");
                return;
            }

            let currentX = townX + parseInt(currentLocationMatch[1], 10);
            let currentY = townY - parseInt(currentLocationMatch[2], 10);

            let currentIndex = movementCoords.findIndex(coord => coord.x === currentX && coord.y === currentY);

            const applyHighlight = () => {
                if (currentIndex === -1 || currentIndex === movementCoords.length - 1) {
                    console.log("No next movement found.");
                    return;
                }

                const nextDestination = movementCoords[currentIndex + 1];

                let direction = '';
                if (nextDestination.x > currentX) direction = 'east';
                else if (nextDestination.x < currentX) direction = 'west';
                else if (nextDestination.y > currentY) direction = 'south';
                else if (nextDestination.y < currentY) direction = 'north';

                const moveElement = document.querySelector(`.action-move-${direction}`);
                if (moveElement) {
                    moveElement.style.backgroundColor = '#afcf9dd9'; // Highlight color
                    console.log(`Highlighting the move: ${direction}`);
                } else {
                    console.error(`No move element found for direction: ${direction}`);
                }
            };

            // Initial highlight
            applyHighlight();

            // Observe for changes in the move buttons and reapply the highlight
            const moveButtonsContainer = document.querySelector('.zone-plane-controls');
            if (moveButtonsContainer) {
                const observer = new MutationObserver(() => {
                    waitForElement('.current-location', (currentLocationDiv) => {
                        currentLocationMatch = currentLocationDiv.textContent.match(/Position: (-?\d+) \/ (-?\d+)/);
                        if (!currentLocationMatch) {
                            console.error("Failed to extract current coordinates.");
                            return;
                        }
                        currentX = townX + parseInt(currentLocationMatch[1], 10);
                        currentY = townY - parseInt(currentLocationMatch[2], 10);
                        currentIndex = movementCoords.findIndex(coord => coord.x === currentX && coord.y === currentY);

                        applyHighlight(); // Reapply highlight when buttons reappear
                    });
                });

                observer.observe(moveButtonsContainer, { childList: true, subtree: true });
            } else {
                console.error("Move buttons container not found for observation.");
            }
        });
    }


    // Create the toggle button (for MyHordes site)
    function createToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Import selected expedition';
        toggleButton.style.position = 'absolute';
        toggleButton.style.width = '200px';
        toggleButton.style.top = '145px';
        toggleButton.style.left = '440px';
        toggleButton.style.zIndex = '998';

        // Toggle input container visibility
        toggleButton.addEventListener('click', () => {
            GM.getValue("fm_route").then((exp) => {
                GM.getValue("fm_townx").then((townx) => {
                    GM.getValue("fm_towny").then((towny) => {
                        // Call the logic to highlight the next movement
                        highlightNextMove(exp, townx, towny);
                    });
                });
            });
        });
        //waitForElement('.manual-background.cell.rw-4.rw-lg-6.rw-md-12', (contentDiv) => {
        waitForElement('#header', (contentDiv) => {
            contentDiv.appendChild(toggleButton);
        });
        //document.body.appendChild(toggleButton);
    }

    // ** Fatamorgana Functionality **

    // Wait for the `data.expeditions` variable to be available
    function waitForExpeditions(callback) {
        const interval = setInterval(() => {
            if (typeof data !== 'undefined' && data.expeditions && data.tx !== undefined && data.ty !== undefined) {
                clearInterval(interval);
                callback(data.expeditions);
            }
        }, 100); // Check every 100ms
    }

    // Create dropdown for expeditions (for Fatamorgana site)
    function createDropdown(expeditions) {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.style.position = 'fixed';
        dropdownContainer.style.top = '90px';
        dropdownContainer.style.left = '40px';
        dropdownContainer.style.zIndex = '10000';
        dropdownContainer.style.backgroundColor = '#fff';
        dropdownContainer.style.border = '1px solid #ccc';
        dropdownContainer.style.padding = '10px';
        dropdownContainer.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
        dropdownContainer.style.display = 'none'; // Initially hidden
        dropdownContainer.id = 'dropdownContainer';

        const townInfo = document.createElement('div');
        townInfo.style.marginBottom = '10px';
        townInfo.innerHTML = `<strong>Town X:</strong> ${data.tx} <br> <strong>Town Y:</strong> ${data.ty}`;
        dropdownContainer.appendChild(townInfo);

        const label = document.createElement('label');
        label.textContent = 'Select Expedition Route: ';
        dropdownContainer.appendChild(label);

        const select = document.createElement('select');
        select.style.marginRight = '10px';

        for (const [key, expedition] of Object.entries(expeditions).reverse()) {
            const option = document.createElement('option');
            option.value = expedition.route;
            option.textContent = expedition.day + " - " + expedition.name;
            select.appendChild(option);
        }
        dropdownContainer.appendChild(select);

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Select';
        dropdownContainer.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            const selectedRoute = select.value;
            GM.setValue("fm_route", selectedRoute);
            GM.setValue("fm_townx", data.tx);
            GM.setValue("fm_towny", data.ty);
        });

        document.body.appendChild(dropdownContainer);

        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Select Route';
        toggleButton.style.position = 'relative';

        toggleButton.addEventListener('click', () => {
            const isHidden = dropdownContainer.style.display === 'none';
            dropdownContainer.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Hide Routes' : 'Show Routes';
        });

        waitForElement('#townInfo', (barDiv) => {
            barDiv.appendChild(toggleButton);
        });
    }

    // Initialize functionalities based on domain
    if (window.location.href.includes('myhordes.eu')) {
        createToggleButton();

        // Apply saved visibility state
        const isExpanded = localStorage.getItem('isExpanded') === 'true';
        const inputContainer = document.querySelector('div[style*="position: fixed"]');
        if (inputContainer) {
            inputContainer.style.display = isExpanded ? 'block' : 'none';
        }
    }

    if (window.location.href.includes('fatamorgana.md26.eu')) {
        waitForExpeditions(createDropdown);
    }
})();
