const TomSelect = require('tom-select/dist/js/tom-select.base')

function loadSelectMenus() {
    document.querySelectorAll('select').forEach(select => {
        if (select.tomSelect == undefined) {
            select.tomSelect = new TomSelect(select, {
                maxItems: 1,
                selectOnTab: true,
                sortField: "text"
            })
        }
        let tomSelect = select.tomSelect
        let selectID = select.id.replace(/[0-9]/g, '')

        if (!selectID.includes('_')) {
            db.collection(selectID).onSnapshot(
                snapshot => {
                    tomSelect.clearOptions()

                    snapshot.docs.forEach(item => {
                        tomSelect.addOption({
                            value: item.ref.path,
                            text: item.get('name')
                        })
                    })
                    if (tomSelect.isOpen) {
                        tomSelect.refreshOptions()
                    }
                },
                error => {
                    console.error(error)
                }
            )
            tomSelect.on("item_add", value => {
                let subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"])')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = false
                        subInput.value = ""

                        db.doc(value).onSnapshot(
                            snapshot => {
                                let inputValue = snapshot.get(subInput.id.split('_')[1])
                                if (inputValue != undefined) {
                                    subInput.value = inputValue
                                }
                            },
                            error => {
                                console.error(error)
                            }
                        )
                    }
                })
                let subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomSelect.enable()

                        db.doc(value).collection(subSelect.id.split('_')[1]).onSnapshot(
                            snapshot => {
                                subSelect.tomSelect.clear()
                                subSelect.tomSelect.clearOptions()

                                snapshot.docs.forEach(item => {
                                    subSelect.tomSelect.addOption({
                                        value: item.ref.path,
                                        text: item.get('name')
                                    })
                                })
                                if (subSelect.tomSelect.isOpen) {
                                    subSelect.tomSelect.refreshOptions()
                                }
                            },
                            error => {
                                console.error(error)
                            }
                        )
                    }
                })
            })
            tomSelect.on("item_remove", () => {
                let subInputs = select.parentElement.parentElement.parentElement.querySelectorAll('input:not([role="combobox"])')
                subInputs.forEach(subInput => {
                    if (subInput.id.split('_')[0] == select.id) {
                        subInput.disabled = true
                        subInput.value = ""
                    }
                })
                let subSelects = select.parentElement.parentElement.parentElement.querySelectorAll('select')
                subSelects.forEach(subSelect => {
                    if (subSelect != select && subSelect.id.split('_')[0] == select.id) {
                        subSelect.tomSelect.disable()
                        subSelect.tomSelect.clear()
                    }
                })
            })
        }
    })
}