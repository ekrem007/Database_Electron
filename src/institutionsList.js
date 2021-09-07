const selectInstitutionType = document.getElementById('institutionType')
selectInstitutionType.materialComponent.listen('MDCSelect:change', () => {
    currentQuery = db.collection(selectInstitutionType.materialComponent.value)
    loadInstitutions()
    labelButtonNew.textContent = translate('NEW#' + selectInstitutionType.materialComponent.value.toUpperCase())
})
const buttonNew = document.querySelector('button#new')
buttonNew.onclick = () => {
    ipcRenderer.send('new-window', 'institution', undefined, selectInstitutionType.materialComponent.value)
}
const labelButtonNew = buttonNew.querySelector('.mdc-button__label')

const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const tableOverlay = document.querySelector("#tableOverlay")
const tableOverlayIcon = tableOverlay.querySelector(".mdi")
const tableOverlayText = tableOverlay.querySelector("h3")

const institutionsTable = document.querySelector("table#institutions")
const institutionsList = institutionsTable.querySelector("tbody#institutionsList")
let currentOrder, currentOrderDirection

const columnsJSON = require("./institutionColumns.json")
const institutionColumnsList = institutionsTable.querySelector("#tableColumnsList")
const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

let currentQuery = db.collection('insurance')
let searchQuery
let foundInstitutions
let currentInstitutionsSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedInstitution, selectedInstitutionRow, selectedInstitutionID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadInstitutions()
    }
    else {
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
    }
})

function newColumn(column) {
    const th = document.createElement('th')
    th.classList.add('mdc-ripple-surface')
    th.materialRipple = new MDCRipple(th)
    th.id = column
    th.innerHTML = translate(columnsJSON[column])
    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != institutionColumnsList) {
                setTableOverlayState('drag')
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != institutionColumnsList) {
            if (institutionsList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState("empty")
            }
        }
    }
    th.onclick = () => {
        if (th.parentElement != hiddenTableColumnsList) {
            headerClick(column)
        }
    }

    const sortIcon = document.createElement('i')
    sortIcon.classList.add('mdi', 'mdi-unfold-more-horizontal')
    th.appendChild(sortIcon)
    th.sortIcon = sortIcon

    return th
}

const Sortable = require("sortablejs")

function loadColumns() {
    setTableOverlayState("loading")

    let columns = Object.keys(columnsJSON)
    if (localStorage.getItem("institutionColumns") != null) {
        columns = localStorage.getItem("institutionColumns").split(',')
    }
    columns.forEach(column => institutionColumnsList.appendChild(newColumn(column)))
    if (columns.includes('name')) {
        headerClick('name')
        headerClick('name')
    }
    else {
        headerClick(columns[columns.length - 1])
    }

    Sortable.create(institutionColumnsList, {
        animation: 150,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        onStart: () => setTableOverlayState('drag'),
        onEnd: () => {
            if (institutionsList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState("empty")
            }
            listInstitutions(currentInstitutionsSnap)
            let institutionColumns = []
            for (let column of tableColumnsList.children) {
                institutionColumns.push(column.id)
            }
            localStorage.setItem('institutionColumns', institutionColumns)
        }
    })
}

loadColumns()

function refreshSearch() {
    setTableOverlayState("loading")
    searchQuery = String(inputSearch.materialComponent.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundInstitutions = new Array()
        let institutionPromises = []

        currentInstitutionsSnap.forEach(institution => {
            if (!foundInstitutions.includes(institution.id)) {
                let data = String(institution.id)
                let valuePromises = []
                Object.values(institution.data()).forEach(value => {
                    if (typeof value === "object" && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += " -- " + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    institutionPromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += " -- " + snaphot.get('name').toString().toLowerCase()
                            })
                            if (data.includes(searchQuery)) {
                                foundInstitutions.push(institution.id)
                            }
                        })
                    )
                }
                else {
                    if (data.includes(searchQuery)) {
                        foundInstitutions.push(institution.id)
                    }
                }
            }
        })

        if (institutionPromises.length > 0) {
            Promise.all(institutionPromises).then(institutions => {
                if (foundInstitutions.length > 0) {
                    listInstitutions(currentInstitutionsSnap)
                }
                else {
                    setTableOverlayState("empty")
                }
            })
        }
        else {
            if (foundInstitutions.length > 0) {
                listInstitutions(currentInstitutionsSnap)
            }
            else {
                setTableOverlayState("empty")
            }
        }
    }
    else {
        clearSearch()
    }
}

inputSearch.oninput = refreshSearch

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    searchQuery = undefined
    foundInstitutions = undefined
    listInstitutions(currentInstitutionsSnap)
}

function headerClick(headerID) {
    const clickedHeader = institutionColumnsList.querySelector('th#' + headerID)
    if (clickedHeader) {
        const otherHeaderIcon = institutionColumnsList.querySelector('.mdi-chevron-up')
        if (otherHeaderIcon) {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('mdi-chevron-up')
                otherHeaderIcon.classList.remove('mdi-rotate-180')
                otherHeaderIcon.classList.add('mdi-unfold-more-horizontal')
            }
        }

        if (clickedHeader.sortIcon.classList.contains('mdi-unfold-more-horizontal')) {
            clickedHeader.sortIcon.classList.remove('mdi-unfold-more-horizontal')
            clickedHeader.sortIcon.classList.add('mdi-chevron-up')
        }

        if (clickedHeader.sortIcon.classList.contains('mdi-rotate-180')) {
            orderInstitutions(headerID, 'asc')
        }
        else {
            orderInstitutions(headerID, 'desc')
        }

        clickedHeader.sortIcon.classList.toggle('mdi-rotate-180')
    }
}

function loadInstitutions() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            listInstitutions(snapshot)
            currentInstitutionsSnap = snapshot
        },
        error => {
            console.error("Error getting institutions: " + error)
            setTableOverlayState("empty")
        }
    )
}

function listInstitutions(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        institutionsList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
        snap.forEach(institutionSnap => {
            if (foundInstitutions == undefined || foundInstitutions.includes(institutionSnap.id)) {
                setTableOverlayState('hide')
                noOneFound = false

                let tr = document.createElement('tr')
                tr.id = institutionSnap.id
                tr.ondblclick = () => {
                    if (getSelectedText() == '') {
                        ipcRenderer.send('new-window', 'institution', selectedInstitutionID, selectInstitutionType.materialComponent.value)
                    }
                }
                tr.onmousedown = mouseEvent => {
                    if (mouseEvent.button != 1) {
                        if (mouseEvent.button == 2) {
                            contextMenu.materialComponent.open = false
                        }
                        if (selectedInstitutionRow) {
                            selectedInstitutionRow.classList.remove('selected')
                        }
                        selectedInstitution = currentQuery.doc(institutionSnap.id)
                        selectedInstitutionID = institutionSnap.id
                        selectedInstitutionRow = tr
                        selectedInstitutionRow.classList.add('selected')
                    }
                }
                tr.onmouseup = mouseEvent => {
                    const hasSelection = getSelectedText() != ''

                    if (hasSelection || mouseEvent.button == 2) {
                        copyOption.hidden = !hasSelection
                        contextMenu.querySelectorAll('li.mdc-list-item:not(#copy)').forEach(option => {
                            option.hidden = hasSelection
                        })
                        contextMenu.style.left = (mouseEvent.clientX + 2) + 'px'
                        contextMenu.style.top = (mouseEvent.clientY + 2) + 'px'
                        contextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX + 2), (mouseEvent.clientY + 2))
                        contextMenu.materialComponent.open = true
                    }
                }
                if (tr.id == selectedInstitutionID) {
                    selectedInstitution = currentQuery.doc(selectedInstitutionID)
                    selectedInstitutionRow = tr
                    selectedInstitutionRow.classList.add('selected')
                }
                institutionsList.appendChild(tr)

                for (const column of institutionColumnsList.children) {
                    const td = document.createElement("td")
                    td.id = column.id
                    tr.appendChild(td)

                    if (td.id == "__name__") {
                        td.textContent = institutionSnap.id
                    }
                    else {
                        const value = institutionSnap.get(td.id)
                        if (value != undefined) {
                            if (typeof value === "object" && value !== null) {
                                currentRefQueries.push(
                                    value.onSnapshot(
                                        snapshot => {
                                            td.textContent = snapshot.get('name')

                                            if (searchQuery != undefined && searchQuery != "") {
                                                td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                                            }

                                            orderInstitutions(currentOrder, currentOrderDirection)
                                        },
                                        error => {
                                            console.error(error)
                                        }
                                    )
                                )
                            }
                            else {
                                switch (td.id) {
                                    case "complaints":
                                        td.textContent = td.title = value
                                        break
                                    default:
                                        if (td.id.includes("Date")) {
                                            td.textContent = new Date(value).toJSON().substr(0, 10)
                                        }
                                        else {
                                            td.textContent = value
                                        }
                                        if (td.id.includes('User')) {
                                            admin.auth().getUserByEmail(value + emailSuffix).then(user => {
                                                if (user.displayName) {
                                                    td.textContent = user.displayName
                                                }
                                            }).catch(error => {
                                                console.error("Error getting user by email: ", error)
                                            })
                                        }
                                        break
                                }
                            }
                        }
                    }

                    if (searchQuery != undefined && searchQuery != "") {
                        td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                    }
                }
            }
        })
        orderInstitutions(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setTableOverlayState("empty")
        }
    }
    else {
        setTableOverlayState("empty")
    }
}

function orderInstitutions(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < institutionsList.children.length - 1; i++) {
            shouldSwitch = false

            const x = institutionsList.children[i].querySelector("td#" + orderBy)
            const y = institutionsList.children[i + 1].querySelector("td#" + orderBy)

            if (orderDirection == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true
                    break
                }
            }
            else if (orderDirection == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true
                    break
                }
            }
        }
        if (shouldSwitch) {
            institutionsList.children[i].parentElement.insertBefore(institutionsList.children[i + 1], institutionsList.children[i])
            switching = true
        }
    }
    while (switching)

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function setTableOverlayState(state) {
    switch (state) {
        case "loading":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.remove("show-headers")
            tableOverlayIcon.classList.add("mdi-loading", "mdi-spin")
            tableOverlayIcon.classList.remove("mdi-emoticon-sad-outline", "mdi-archive-arrow-up-outline")
            tableOverlayText.hidden = true
            break
        case "empty":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.remove("show-headers")
            tableOverlayIcon.classList.add("mdi-emoticon-sad-outline")
            tableOverlayIcon.classList.remove("mdi-loading", "mdi-spin", "mdi-archive-arrow-up-outline")
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate("institutions_NOT_FOUND")
            break
        case "drag":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.add("show-headers")
            tableOverlayIcon.classList.add("mdi-archive-arrow-up-outline")
            tableOverlayIcon.classList.remove("mdi-loading", "mdi-spin", "mdi-emoticon-sad-outline")
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate("DRAG_AND_DROP")
            break
        case "hide":
            tableOverlay.classList.add("hide")
            break
        default:
            break
    }
}

const { writeFile, utils } = require('xlsx')

function exportToExcel() {
    ipcRenderer.send('dialog-save', new Date().toLocaleString().replace(',', '').replaceAll(':', '-') + '.xlsx')
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(institutionsTable), filePath)
})

let stopFilteredCasesQuery = () => { }

const contextMenu = document.getElementById('contextMenu')
const copyOption = document.getElementById('copy')
copyOption.onclick = copySelectionToClipboard
const editOption = document.getElementById('edit')
editOption.onclick = () => ipcRenderer.send('new-window', 'institution', selectedInstitutionID, selectInstitutionType.materialComponent.value)
const deleteOption = document.getElementById('delete')
deleteOption.onclick = () => {
    const filteredCases = allCases.where(selectInstitutionType.materialComponent.value, '==', db.doc(selectInstitutionType.materialComponent.value + '/' + selectedInstitution.id))

    stopFilteredCasesQuery()
    stopFilteredCasesQuery = filteredCases.onSnapshot(
        snapshot => {
            let prefix

            foundCasesLinks.innerHTML = ''

            if (snapshot.docs.length > 0) {
                iconDialogDeleteInstitution.classList.remove('mdi-help-circle-outline')
                iconDialogDeleteInstitution.classList.add('mdi-alert')

                prefix = 'CANT_DELETE#THIS_'
                textDialogDeleteInstitution.classList.remove('mb-0')
                textDialogDeleteInstitution.classList.add('mb-2')

                for (let i = 0; i < snapshot.docs.length; i++) {
                    const _case = snapshot.docs[i];

                    const link = document.createElement('a')
                    link.href = '#'
                    link.innerText = '#' + _case.id
                    link.id = _case.id
                    link.onclick = () => ipcRenderer.send('new-window', 'case', _case.id)
                    foundCasesLinks.appendChild(link)

                    if (i < snapshot.docs.length - 1) {
                        const comma = document.createElement('b')
                        comma.innerText = ' , '
                        foundCasesLinks.appendChild(comma)
                    }
                }
                dialogDeleteInstitution.materialComponent.buttons[1].disabled = true
            }
            else {
                iconDialogDeleteInstitution.classList.add('mdi-help-circle-outline')
                iconDialogDeleteInstitution.classList.remove('mdi-alert')

                prefix = 'ASK_DELETE#THIS_'
                textDialogDeleteInstitution.classList.add('mb-0')
                textDialogDeleteInstitution.classList.remove('mb-2')

                dialogDeleteInstitution.materialComponent.buttons[1].disabled = false
            }
            textDialogDeleteInstitution.innerText = translate(prefix + selectInstitutionType.materialComponent.value.toUpperCase())

            dialogDeleteInstitution.materialComponent.open()
        },
        error => {
            console.error("Error getting filtered cases: " + error)
        }
    )
}

const dialogDeleteInstitution = document.querySelector('#dialogDeleteInstitution')
const iconDialogDeleteInstitution = dialogDeleteInstitution.querySelector('.mdi')
const textDialogDeleteInstitution = dialogDeleteInstitution.querySelector('p')
const foundCasesLinks = dialogDeleteInstitution.querySelector('span')

dialogDeleteInstitution.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        selectedInstitution.delete().then(() => {
            selectedInstitution = undefined
            selectedInstitutionID = undefined
        }).catch(error => {
            console.error('Error removing institution: ', error)
        })
    }
})

function getSelectedText() {
    if (getSelection().toString().replaceAll('\n', '').replaceAll('\t', '').trim() != '') {
        return getSelection().toString()
    }
    else {
        return ''
    }
}

function copySelectionToClipboard() {
    const selectedText = getSelectedText()
    if (selectedText != '') {
        navigator.clipboard.writeText(selectedText)
        alert('"' + selectedText + '"' + translate("COPIED"))
    }
}