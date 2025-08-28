const dropZone = document.querySelector('.file_uploader')
const fileInput = document.querySelector('.file-input')
const events = ['dragenter', 'dragover', 'dragleave', 'drop']

events.forEach(eventName => {
    dropZone.addEventListener(eventName, e => e.preventDefault())
})

dropZone.addEventListener('dragover', () => {
    dropZone.classList.add('dragover')
})

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
})

dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')

    const files = e.dataTransfer.files

    const dataTransfer = new DataTransfer()

    for (let file of files) {
        dataTransfer.items.add(file)
    }
    fileInput.files = dataTransfer.files

    add_file()
})

var select_file_card = document.querySelector('#select_file_card')
var upload_file_card = document.querySelector('#upload_file_card')
var options_card = document.querySelector('#options_card')
var file = document.querySelector('.file')

var file_input = document.querySelector('.file-input')

// if (file_input.value) {
//     add_file()
// }

function add_file() {
    var select_file = file_input.files[0]

    if (select_file.name.split('.').at(-1) != 'mp4') {
        show_toast('Неподдерживаемый тип файла', false)
        file_input.value = ''

        return
    } else if (select_file.size > 104857600) {
        show_toast('Слишком большой вес файла', false)
        file_input.value = ''

        return
    }

    select_file_card.classList.add('d-none')
    upload_file_card.classList.remove('d-none')

    file.querySelector('.file-name').textContent = select_file.name
    file.querySelector('.file-size').textContent = formatFileSize(select_file.size)

    upload_file()
}

function upload_file() {
    var select_file = file_input.files[0]

    var formData = new FormData()
    formData.append('file', select_file)

    var xhttp = new XMLHttpRequest()
    
    xhttp.onload = function() {
        if (xhttp.status == 200) {
            const response = JSON.parse(xhttp.responseText)

            upload_file_card.querySelector('.btn-lg').classList.remove('disabled')

            setStoredData({
                name: select_file.name,
                original_size: select_file.size,
                processed_size: null,
                file_id: response.file_id,
            })
        } else {
            show_toast('Произошла ошибка', false)
        }
    }

    xhttp.upload.addEventListener('progress', function(e) {
        const percentComplete = (e.loaded / e.total) * 100

        set_progress(document.querySelector('#upload_file_card .file-icon'), percentComplete)
    })

    xhttp.open('POST', '/upload')
    xhttp.send(formData)
}

function show_options_card() {
    upload_file_card.classList.add('d-none')
    options_card.classList.remove('d-none')
}

function delete_file() {
    removeStoredData(file_input.files[0].name)

    file_input.value = ''

    set_progress(document.querySelector('#upload_file_card .file-icon'), 0)

    file.querySelector('.file-name').textContent = ''
    file.querySelector('.file-size').textContent = ''

    select_file_card.classList.remove('d-none')
    upload_file_card.classList.add('d-none')

    upload_file_card.querySelector('.btn-lg').classList.add('disabled')
}

function set_progress(element, percent) {
    const progress = (percent / 100) * 251
    element.style.setProperty('--progress', progress)
}

function show_toast(message, success) {
    const toastId = 'toast-' + Date.now()
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-${success ? 'success' : 'danger'} border-0 rounded-3">
            <div class="d-flex">
                <div class="toast-body fs-6">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `

    let container = document.querySelector('.toast-container')
    container.insertAdjacentHTML('beforeend', toastHtml)

    const toastEl = document.getElementById(toastId)

    toastEl.addEventListener('hidden.bs.toast', function() {
        this.remove()
    })

    const toast = new bootstrap.Toast(toastEl, {
        delay: 5000,
        autohide: true
    })

    toast.show()
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const value = bytes / Math.pow(k, i)

    const formattedValue = value % 1 === 0 ? value.toString() : value.toFixed(2)
    
    return formattedValue + ' ' + sizes[i]
}

function setStoredData(newFile) {
    const files = JSON.parse(localStorage.getItem('files')) || []

    files.push(newFile)

    localStorage.setItem('files', JSON.stringify(files))
}

function removeStoredData(filename) {
    const files = JSON.parse(localStorage.getItem('files')) || []

    if (files.length) {
        files = files.filter(file => file.name !== filename)

        localStorage.setItem('files', JSON.stringify(files))
    }
}

function togglePanel(event) {
    if (!event.target.closest('.switch')) {
        if (!event.currentTarget.querySelector('input').checked) {
            event.currentTarget.querySelector('input').checked = true
            return
        }

        event.currentTarget.nextElementSibling.classList.toggle('d-none')
    } else {
        if (event.currentTarget.querySelector('input').checked) {
            event.currentTarget.nextElementSibling.classList.add('d-none')
        }            
    }
}

let openElement = null
let originalHTML = null

function selectColor(element) {
    event.stopPropagation()

    if (openElement && openElement !== element) {
        restoreOriginalContent(openElement)
    }

    if (element.classList.contains('color-picker-open')) return

    originalHTML = element.innerHTML
    openElement = element
    const currentColor = element.getAttribute('data-selected-color')

    element.innerHTML = `
        <div class="col-12 d-flex justify-content-center align-items-center flex-wrap">
            <div class="rounded-circle mx-1 bg-primary color-option ${currentColor === 'primary' ? 'selected-color' : ''}" 
                onclick="chooseColor('primary')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-secondary color-option ${currentColor === 'secondary' ? 'selected-color' : ''}" 
                onclick="chooseColor('secondary')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-success color-option ${currentColor === 'success' ? 'selected-color' : ''}" 
                onclick="chooseColor('success')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-danger color-option ${currentColor === 'danger' ? 'selected-color' : ''}" 
                onclick="chooseColor('danger')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-warning color-option ${currentColor === 'warning' ? 'selected-color' : ''}" 
                onclick="chooseColor('warning')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-info color-option ${currentColor === 'info' ? 'selected-color' : ''}" 
                onclick="chooseColor('info')" style="width: 40px; height: 40px;"></div>
            <div class="rounded-circle mx-1 bg-light color-option ${currentColor === 'light' ? 'selected-color' : ''}" 
                onclick="chooseColor('light')" style="width: 40px; height: 40px;"></div>
        </div>
    `

    element.classList.add('color-picker-open')
}

function chooseColor(color) {
    event.stopPropagation()

    if (!openElement) return

    openElement.setAttribute('data-selected-color', color)

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = originalHTML
    const colorCircle = tempDiv.querySelector('.rounded-circle')

    colorCircle.className = 'rounded-circle bg-' + color

    if (color === 'light') {
        colorCircle.style.border = '2px dashed #252423'
    } else {
        colorCircle.style.border = ''
    }

    originalHTML = tempDiv.innerHTML

    restoreOriginalContent(openElement)
}

function restoreOriginalContent(element) {
    element.innerHTML = originalHTML
    element.classList.remove('color-picker-open')
    openElement = null
}

document.addEventListener('click', function(e) {
    if (openElement && !openElement.contains(e.target)) {
        restoreOriginalContent(openElement)
    }
})

const options = document.querySelectorAll('.modal .option')

options.forEach(option => {
    option.addEventListener('click', function() {
        options.forEach(opt => {
            const checkmark = opt.querySelector('.chevron')
            checkmark.classList.add('d-none')
        })

        const selectedCheckmark = this.querySelector('.chevron')
        selectedCheckmark.classList.remove('d-none')

        const modelName = this.querySelector('label').textContent

        document.querySelector('#select_model').dataset.selectedModel = modelName
    })
})

function collectSettings() {
    const settings = {
        counterLine: {
            enabled: document.querySelector('#counterLine').checked,
            color: getComputedStyle(document.querySelector('#counterLineColor .rounded-circle')).backgroundColor,
            threshold: parseInt(document.querySelector('#threshold').value),
            showResponseZone: document.querySelector('#showResponseZone').checked
        },

        objectFrame: {
            enabled: document.querySelector('#objectFrame').checked,
            color: getComputedStyle(document.querySelector('#objectFrameColor .rounded-circle')).backgroundColor,
            showClassName: document.querySelector('#showClassName').checked,
            showClassProbability: document.querySelector('#showClassProbability').checked,
            showCenter: document.querySelector('#showCenter').checked
        },

        textColor: getComputedStyle(document.querySelector('#textColor .rounded-circle')).backgroundColor,

        selectedModel: document.querySelector('#select_model').dataset.selectedModel
    }
    
    return settings
}

function processing() {
    const files = JSON.parse(localStorage.getItem('files')) || []
    const file_id = files.at(-1).file_id

    var xhttp = new XMLHttpRequest()

    xhttp.onload = function() {
        if (xhttp.status == 200) {
            document.querySelector('#options_card').classList.add('d-none')
            document.querySelector('#processing').classList.remove('d-none')

            function pollProgress() {
                var xhttp = new XMLHttpRequest()

                xhttp.onload = function() {
                    if (xhttp.status == 200) {
                        const response = JSON.parse(xhttp.responseText)

                        if (response.progress < 100) {
                            setTimeout(pollProgress, 1000)
                        } else if (response.progress >= 100) {
                            updateProcessedSize(file_id, response.processed_size)

                            window.location = '/uploads'
                        }

                        document.querySelector('#processing .percent').textContent = Math.round(response.progress) + '%'

                        set_progress(document.querySelector('#processing .file-icon'), response.progress)
                    } else if (xhttp.status === 404) {
                        setTimeout(pollProgress, 1000)
                    }
                }

                xhttp.open('GET', `/progress/${file_id}`)
                xhttp.send()
            }

            pollProgress()
        }
    }

    xhttp.open('POST', '/processing')
    xhttp.send(JSON.stringify({
        file_id: file_id,
        options: collectSettings()
    }))
}

function updateProcessedSize(file_id, value) {
    const files = JSON.parse(localStorage.getItem('files')) || []

    const updatedFiles = files.map(file => {
        if (file.file_id == file_id) {
            return {
                ...file,
                processed_size: value
            }
        }
        return file
    })

    localStorage.setItem('files', JSON.stringify(updatedFiles))
}