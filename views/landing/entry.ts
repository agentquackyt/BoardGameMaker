import Modal from '../../system/types/ModalManager';

const testModal = new Modal('Test Modal', 'This is a test modal to demonstrate the ModalManager functionality.')
    .addTextField('Name', 'Jonas' , true)
    .addNumberField('Age')
    .addColorField('Favorite Color')
    .addBooleanField('Subscribe to Newsletter')
    .addSelectField('Country', ['USA', 'Canada', 'UK', 'Australia'], 'USA', true)
    //.setConditionalField('Subscribe to Newsletter', 'Age', 18)
    .setConditionalField('Country', 'Subscribe to Newsletter', true)
    .addMillimeterField('Height in mm');

document.getElementById('test')?.addEventListener('click', () => {
    testModal.show().then(values => {
        console.log('Modal values:', values);
    }); 
});