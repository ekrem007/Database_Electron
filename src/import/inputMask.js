require('inputmask')

function mask(input, mask = input.getAttribute('mask'), dontAlignRight) {
    const options = {
        showMaskOnHover: false
    }
    switch (mask) {
        case 'time':
        case 'date':
            options.alias = 'datetime'
            break
        case 'price':
        case 'percent':
            input.onchange = () => { if (input.value == '') input.value = 0 }
            break
    }
    switch (mask) {
        case 'time':
            options.inputFormat = 'HH:MM'
            options.placeholder = '--:--'
            break
        case 'date':
            options.inputFormat = 'dd.mm.yyyy'
            options.outputFormat = 'yyyy-mm-dd'
            options.placeholder = '--.--.----'
            break
        case 'tel':
            options.alias = '[+]9999999[99999999]'
            options.placeholder = ''
            options.onUnMask = maskedValue => { return maskedValue }
            break
        case 'price':
            options.alias = 'currency'
            options.showMaskOnFocus = false
            options.unmaskAsNumber = true
            break
        case 'percent':
            options.regex = '[0-9]|[1-9][0-9]|100'
            options.rightAlign = true
            options.placeholder = ''
            options.onUnMask = maskedValue => { return parseInt(maskedValue) }
            break
        case 'quantity':
            options.regex = '[0-9]|[1-9][0-9]|[1-9][0-9][0-9]|1000'
            options.placeholder = ''
            options.onUnMask = maskedValue => { return parseInt(maskedValue) }
            break
    }
    if (dontAlignRight) {
        options.rightAlign = false
    }
    new Inputmask(options).mask(input)
    input.inputmask.destroy = () => {
        input.inputmask.remove()
        if (input.style.textAlign) {
            input.style.textAlign = ''
        }
    }
}
document.querySelectorAll('input[mask]').forEach(input => mask(input))