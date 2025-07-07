document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.querySelector('.file-label');
  const fileLabelText = document.getElementById('file-label-text');
  const selectedFilesPreview = document.getElementById('selected-files-preview');
  const outputFormatContainerVideo = document.getElementById('outputFormatContainerVideo');
  const outputFormatContainerAudio = document.getElementById('outputFormatContainerAudio');
  const outputFormatContainerImage = document.getElementById('outputFormatContainerImage');
  const formatOptionsSection = document.getElementById('format-options-section');
  const formatOptionsDiv = document.getElementById('format-options');
  const customCommand = document.getElementById('customCommand');
  const convertButton = document.getElementById('convertButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const downloadManager = document.getElementById('download-manager');
  const downloadTable = document.getElementById('download-table').getElementsByTagName('tbody')[0];
  const downloadAllButton = document.getElementById('downloadAllButton');
  const downloadSearch = document.getElementById('download-search');
  const noDownloadsMessage = document.getElementById('no-downloads-message');
  const themeToggle = document.getElementById('themeToggle');
  const commandSuggestions = document.getElementById('command-suggestions');
  const settingsButton = document.getElementById('settings-button');
  const closeSidebarButton = document.getElementById('close-sidebar');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const defaultDownloadDirInput = document.getElementById('default-download-dir');
  const autoDownloadCheckbox = document.getElementById('auto-download');
  const toastContainer = document.getElementById('toast-container');

  let selectedFiles = [];
  let outputFormats = { video: [], audio: [], image: [] };
  let selectedOutputFormat = null;
  let downloads = JSON.parse(localStorage.getItem('downloads')) || []; // Store download data
  let currentSort = { column: 'name', direction: 'asc' };

  const ffmpegCommands = [
    '-c:v libx264',
    '-c:v libx265',
    '-c:v libvpx-vp9',
    '-c:a aac',
    '-c:a libopus',
    '-b:v 2M',
    '-b:a 128k',
    '-vf "scale=-2:720"',
    '-vf "scale=-2:1080"',
    '-preset slow',
    '-preset fast',
    '-crf 22',
    '-t 10',
    '-ss 00:00:30'
  ];

  const defaultFileLabelText = 'Select or Drag & Drop your media file here';

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="close-toast">&times;</button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    const closeButton = toast.querySelector('.close-toast');
    closeButton.addEventListener('click', () => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    });

    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
  };

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle.checked = theme === 'light';
    // Update theme icons
    const moonIcon = document.querySelector('.slider .moon-icon');
    const sunIcon = document.querySelector('.slider .sun-icon');
    if (theme === 'dark') {
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    } else {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
  };

  const fetchOutputFormats = async () => {
    try {
      const response = await fetch('/output-formats');
      if (!response.ok) throw new Error('Failed to load output formats');
      const allFormats = await response.json();
      outputFormats.video = allFormats.filter(f => f.type === 'video');
      outputFormats.audio = allFormats.filter(f => f.type === 'audio');
      outputFormats.image = allFormats.filter(f => f.type === 'image');
      renderOutputFormatCards();
      showTab('video'); // Show video tab by default
    } catch (error) {
      console.error('Error fetching output formats:', error);
      outputFormatContainerVideo.innerHTML = '<p>Error loading video formats</p>';
      outputFormatContainerAudio.innerHTML = '<p>Error loading audio formats</p>';
      outputFormatContainerImage.innerHTML = '<p>Error loading image formats</p>';
    }
  };

  const renderOutputFormatCards = () => {
    outputFormatContainerVideo.innerHTML = '';
    outputFormatContainerAudio.innerHTML = '';
    outputFormatContainerImage.innerHTML = '';

    outputFormats.video.forEach(format => {
      const card = createFormatCard(format);
      outputFormatContainerVideo.appendChild(card);
    });
    outputFormats.audio.forEach(format => {
      const card = createFormatCard(format);
      outputFormatContainerAudio.appendChild(card);
    });
    outputFormats.image.forEach(format => {
      const card = createFormatCard(format);
      outputFormatContainerImage.appendChild(card);
    });
  };

  const createFormatCard = (format) => {
    const card = document.createElement('div');
    card.className = 'output-format-card';
    card.dataset.extension = format.extension;
    card.dataset.type = format.type;
    
    const title = document.createElement('h3');
    title.textContent = format.name;

    const icon = document.createElement('i');
    if (format.type === 'video') {
      icon.className = 'fas fa-video output-format-icon';
    } else if (format.type === 'audio') {
      icon.className = 'fas fa-music output-format-icon';
    } else if (format.type === 'image') {
      icon.className = 'fas fa-image output-format-icon';
    }
    card.appendChild(icon);

    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.dataset.tooltip = format.description;
    tooltip.innerHTML = '<i class="fas fa-circle-question"></i>';
    title.appendChild(tooltip);
    
    card.appendChild(title);
    return card;
  };

  const handleFileSelection = (files) => {
    selectedFiles = Array.from(files);
    selectedFilesPreview.innerHTML = ''; // Clear previous previews

    if (selectedFiles.length > 0) {
      fileLabel.classList.add('has-files');
      fileLabelText.textContent = `${selectedFiles.length} file(s) selected`;
      selectedFiles.forEach((file, index) => {
        createThumbnailCard(file, index);
      });
      convertButton.disabled = false;
    } else {
      fileLabel.classList.remove('has-files');
      fileLabelText.textContent = defaultFileLabelText;
      convertButton.disabled = true;
    }
  };

  const createThumbnailCard = async (file, index) => {
    const card = document.createElement('div');
    card.className = 'file-thumbnail-card';
    card.dataset.index = index;

    const thumbnail = document.createElement('img');
    thumbnail.className = 'file-thumbnail';

    if (file.type.startsWith('image/')) {
      thumbnail.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      thumbnail.src = await generateVideoThumbnail(file);
    } else {
      thumbnail.src = '512x512.webp'; // Generic file icon
    }

    const info = document.createElement('div');
    info.className = 'file-info';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;

    const status = document.createElement('span');
    status.className = 'file-status';
    status.textContent = 'Waiting';

    const removeButton = document.createElement('i');
    removeButton.className = 'fas fa-times-circle remove-file';
    removeButton.dataset.index = index;

    info.appendChild(name);
    info.appendChild(status);
    card.appendChild(thumbnail);
    card.appendChild(info);
    card.appendChild(removeButton);

    selectedFilesPreview.appendChild(card);
  };

  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };
  
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const convertFile = async () => {
    if (selectedFiles.length === 0) return;

    setUIState(true);
    renderDownloadTable(); // Initialize download table display

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileCard = document.querySelector(`.file-thumbnail-card[data-index='${i}']`);
      const statusElement = fileCard.querySelector('.file-status');
      
      statusElement.textContent = 'Converting...';
      progressBar.hidden = false;
      progressBar.value = 0;
      progressText.textContent = `Starting conversion for ${file.name}...`;

      const formData = new FormData();
      formData.append('inputFile', file);
      
      const customCommandValue = customCommand.value.trim();

      if (customCommandValue) {
        formData.append('customCommand', customCommandValue);
      } else if (selectedOutputFormat) {
        formData.append('outputExtension', selectedOutputFormat.extension);
        formData.append('outputType', selectedOutputFormat.type);
        selectedOutputFormat.configurableOptions.forEach(option => {
          const inputElement = document.getElementById(option.id);
          if (inputElement) {
            if (option.type === 'checkbox') {
              formData.append(option.id, inputElement.checked);
            } else {
              formData.append(option.id, inputElement.value);
            }
          }
        });
      } else {
        showToast('Please select an output format or enter a custom command.', 'warning');
        setUIState(false);
        return;
      }

      try {
        const response = await fetch('/convert', {
          method: 'POST',
          body: formData,
        });

        const { jobId } = await response.json();

        const eventSource = new EventSource(`/progress/${jobId}`);
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          progressBar.value = data.progress;
          progressText.textContent = `${data.status}: ${Math.round(data.progress)}%`;

          if (data.status === 'completed') {
            statusElement.textContent = 'Done';
            statusElement.style.color = 'green';
            showToast(`Conversion of ${file.name} completed successfully!`, 'success');
            progressBar.hidden = true;
            progressText.textContent = '';

            const newDownload = {
              jobId: jobId,
              name: data.outputFileName,
              originalSize: file.size,
              convertedSize: data.convertedSize,
              type: data.outputExtension,
            };
            downloads.push(newDownload);
            localStorage.setItem('downloads', JSON.stringify(downloads)); // Save downloads to localStorage
            renderDownloadTable();
            
            if (autoDownloadCheckbox.checked) {
              const tempDownloadLink = document.createElement('a');
              tempDownloadLink.href = `/download/${jobId}`;
              tempDownloadLink.download = data.outputFileName;
              document.body.appendChild(tempDownloadLink);
              tempDownloadLink.click();
              document.body.removeChild(tempDownloadLink);
            }
            eventSource.close();
          } else if (data.status === 'error') {
            statusElement.textContent = 'Error';
            statusElement.style.color = 'red';
            showToast(`Error converting ${file.name}: ${data.error}`, 'error');
            progressBar.hidden = true;
            progressText.textContent = `Error converting ${file.name}: ${data.error}`;
            eventSource.close();
          }
        };
      } catch (error) {
        console.error('Conversion error:', error);
        statusElement.textContent = 'Error';
        statusElement.style.color = 'red';
        showToast(`Error starting conversion for ${file.name}: ${error.message}`, 'error');
      }
    }
    setUIState(false);
  };

  const renderDownloadTable = async () => {
    downloadTable.innerHTML = '';
    const searchTerm = downloadSearch.value.toLowerCase();

    // Filter and validate downloads
    const validatedDownloads = [];
    for (const download of downloads) {
      try {
        const response = await fetch(`/check-file/${download.name}`);
        if (response.ok) {
          validatedDownloads.push(download);
        } else {
          console.warn(`File ${download.name} not found on server, removing from downloads.`);
        }
      } catch (error) {
        console.error(`Error checking file ${download.name}:`, error);
      }
    }
    downloads = validatedDownloads; // Update the downloads array with only valid entries
    localStorage.setItem('downloads', JSON.stringify(downloads)); // Update localStorage

    const filteredDownloads = downloads.filter(download => 
      download.name.toLowerCase().includes(searchTerm)
    );

    filteredDownloads.sort((a, b) => {
      const aValue = a[currentSort.column];
      const bValue = b[currentSort.column];

      if (typeof aValue === 'string') {
        return currentSort.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return currentSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    if (filteredDownloads.length === 0) {
      noDownloadsMessage.hidden = false;
      downloadAllButton.hidden = true;
      downloadManager.style.display = 'none'; // Explicitly hide the download manager section
    } else {
      noDownloadsMessage.hidden = true;
      downloadAllButton.hidden = false;
      downloadManager.style.display = 'block'; // Explicitly show the download manager section
      document.getElementById('downloads-tab').hidden = false; // Ensure the downloads tab is visible
      filteredDownloads.forEach(data => {
        const row = downloadTable.insertRow();
        row.insertCell(0).textContent = data.name;
        row.insertCell(1).textContent = formatBytes(data.originalSize);
        row.insertCell(2).textContent = formatBytes(data.convertedSize);
        
        const downloadCell = row.insertCell(3);
        const downloadButton = document.createElement('button');
        downloadButton.className = 'download-table-button'; // Add a class for styling
        downloadButton.innerHTML = '<i class="fas fa-download"></i>';
        downloadButton.onclick = () => window.location.href = `/download/${data.jobId}`;
        downloadCell.appendChild(downloadButton);
      });
    }
  };

  downloadSearch.addEventListener('input', renderDownloadTable);

  document.querySelectorAll('#download-table th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.sort;
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }
      renderDownloadTable();
    });
  });

  const setUIState = (isConverting) => {
    fileInput.disabled = isConverting;
    // Disable/enable input elements for configurable options
    if (selectedOutputFormat && selectedOutputFormat.configurableOptions) {
      selectedOutputFormat.configurableOptions.forEach(option => {
        const inputElement = document.getElementById(option.id);
        if (inputElement) {
          inputElement.disabled = isConverting;
          inputElement.style.pointerEvents = isConverting ? 'none' : 'auto';
          inputElement.style.opacity = isConverting ? 0.5 : 1;
        }
      });
    }
    convertButton.disabled = isConverting || selectedFiles.length === 0;
    document.getElementById('settings-button').disabled = isConverting;

    // Disable/enable remove buttons on thumbnail cards
    selectedFilesPreview.querySelectorAll('.remove-file').forEach(button => {
      button.style.pointerEvents = isConverting ? 'none' : 'auto';
      button.style.opacity = isConverting ? 0.5 : 1;
    });
  };

  fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files));
  fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('dragover');
  });
  fileLabel.addEventListener('dragleave', () => fileLabel.classList.remove('dragover'));
  fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFileSelection(e.dataTransfer.files); // Handle multiple files on drop
    }
  });

  selectedFilesPreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file')) {
      const indexToRemove = parseInt(e.target.dataset.index);
      selectedFiles.splice(indexToRemove, 1);
      handleFileSelection(selectedFiles); // Re-render the file list
    }
  });

  document.querySelectorAll('.output-format-container').forEach(container => {
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.output-format-card');
      if (!card) return;

      // Remove 'selected' class from all cards in all containers
      document.querySelectorAll('.output-format-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const selectedExtension = card.dataset.extension;
      const selectedType = card.dataset.type;
      
      // Find the selected format across all categories
      selectedOutputFormat = Object.values(outputFormats).flat().find(format => format.extension === selectedExtension && format.type === selectedType);
      
      renderFormatOptions(selectedOutputFormat);
    });
  });

  const showTab = (tabType) => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[data-tab-type="${tabType}"]`).classList.add('active');

    const outputFormatSelection = document.querySelector('.output-format-selection');
    let maxHeight = 0;

    document.querySelectorAll('.tab-content-formats').forEach(content => {
      if (content.id === `${tabType}-formats-tab`) {
        content.classList.add('active');
        // Temporarily make it visible to measure height
        content.style.position = 'relative';
        content.style.visibility = 'hidden';
        content.style.opacity = '0';
        content.style.display = 'block';
        maxHeight = Math.max(maxHeight, content.offsetHeight);
        content.style.position = '';
        content.style.visibility = '';
        content.style.opacity = '';
        content.style.display = '';
      } else {
        content.classList.remove('active');
      }
    });

    outputFormatSelection.style.minHeight = `${maxHeight}px`;

    // Re-apply active class after height is set to trigger transition
    document.querySelectorAll('.tab-content-formats').forEach(content => {
      if (content.id === `${tabType}-formats-tab`) {
        content.classList.add('active');
      }
    });
  };

  // Tab switching logic for format types
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      showTab(e.target.dataset.tabType);
    });
  });

  const renderFormatOptions = (format) => {
    formatOptionsDiv.innerHTML = '';
    formatOptionsSection.hidden = false;

    if (format && format.configurableOptions) {
      format.configurableOptions.forEach(option => {
        const selectGroup = document.createElement('div');
        selectGroup.className = 'select-group';

        const label = document.createElement('label');
        label.setAttribute('for', option.id);
        label.textContent = option.label;
        if (option.tooltip) {
          const tooltipSpan = document.createElement('span');
          tooltipSpan.className = 'tooltip';
          tooltipSpan.dataset.tooltip = option.tooltip;
          tooltipSpan.innerHTML = '<i class="fas fa-circle-question"></i>';
          label.appendChild(tooltipSpan);
        }
        selectGroup.appendChild(label);

        let inputElement;
        switch (option.type) {
          case 'select':
            inputElement = document.createElement('select');
            option.values.forEach(val => {
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              inputElement.appendChild(opt);
            });
            inputElement.value = option.default;
            break;
          case 'range':
            inputElement = document.createElement('input');
            inputElement.type = 'range';
            inputElement.min = option.min;
            inputElement.max = option.max;
            inputElement.step = option.step;
            inputElement.value = option.default;
            const rangeValueSpan = document.createElement('span');
            rangeValueSpan.textContent = option.default;
            inputElement.addEventListener('input', () => {
              rangeValueSpan.textContent = inputElement.value;
            });
            selectGroup.appendChild(rangeValueSpan);
            break;
          case 'checkbox':
            inputElement = document.createElement('input');
            inputElement.type = 'checkbox';
            inputElement.checked = option.default;
            break;
          case 'number':
            inputElement = document.createElement('input');
            inputElement.type = 'number';
            inputElement.placeholder = `e.g., ${option.default}`;
            inputElement.value = option.default;
            break;
          case 'text':
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.placeholder = `e.g., ${option.default}`;
            inputElement.value = option.default;
            break;
          default:
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.value = option.default;
        }
        inputElement.id = option.id;
        selectGroup.appendChild(inputElement);
        formatOptionsDiv.appendChild(selectGroup);
      });
    }
  };

  customCommand.addEventListener('input', () => {
    const currentValue = customCommand.value;
    const lastWord = currentValue.split(' ').pop();
    
    if (lastWord.startsWith('-')) {
      const suggestions = ffmpegCommands.filter(cmd => cmd.startsWith(lastWord));
      renderSuggestions(suggestions);
    } else {
      commandSuggestions.innerHTML = '';
    }
  });

  const renderSuggestions = (suggestions) => {
    commandSuggestions.innerHTML = '';
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.addEventListener('click', () => {
        const words = customCommand.value.split(' ');
        words.pop();
        words.push(suggestion);
        customCommand.value = words.join(' ') + ' ';
        commandSuggestions.innerHTML = '';
        customCommand.focus();
      });
      commandSuggestions.appendChild(item);
    });
  };

  downloadAllButton.addEventListener('click', () => {
    const jobIds = downloads.map(download => download.jobId);
    const outputFilenames = downloads.map(download => download.name); // Get the output filenames
    if (jobIds.length > 0) {
      // Pass both jobIds and outputFilenames
      window.location.href = `/download-all?jobIds=${jobIds.join(',')}&outputFilenames=${outputFilenames.join(',')}`;
    }
  });

  const appVersion = document.documentElement.dataset.version || 'N/A';
  document.querySelector('.app-info p').textContent = `Version: ${appVersion}`;

  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  };

  settingsButton.addEventListener('click', openSidebar);
  closeSidebarButton.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  defaultDownloadDirInput.addEventListener('change', (e) => {
    localStorage.setItem('defaultDownloadDir', e.target.value);
  });

  autoDownloadCheckbox.addEventListener('change', (e) => {
    localStorage.setItem('autoDownload', e.target.checked);
  });

  convertButton.addEventListener('click', convertFile);
  themeToggle.addEventListener('change', () => setTheme(themeToggle.checked ? 'light' : 'dark'));

  loadTheme();
  fetchOutputFormats();

  // Tab switching logic
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const tabId = item.dataset.tab;
      tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
          // Show the active tab
          content.style.display = 'block'; // Make it visible immediately
          setTimeout(() => {
            content.style.opacity = 1; // Start fade-in
          }, 10); // Small delay to ensure display:block is applied
        } else {
          // Hide inactive tabs
          content.style.opacity = 0; // Start fade-out
          setTimeout(() => {
            content.style.display = 'none'; // Hide completely after fade-out
          }, 300); // Match CSS transition duration
        }
      });
    });
  });

  // Load settings on startup
  defaultDownloadDirInput.value = localStorage.getItem('defaultDownloadDir') || '';
  autoDownloadCheckbox.checked = localStorage.getItem('autoDownload') === 'true';
  renderDownloadTable(); // Initial render of download table

  // Add tooltip to custom command section
  const customCommandTooltip = document.querySelector('.custom-command-section .tooltip');
  customCommandTooltip.addEventListener('click', () => {
    window.open('https://ffmpeg.org/ffmpeg.html', '_blank');
  });

  // Collapsible sections logic
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      const content = document.getElementById(targetId);
      if (content) {
        header.classList.toggle('expanded');
        content.classList.toggle('expanded');
      }
    });
  });
});