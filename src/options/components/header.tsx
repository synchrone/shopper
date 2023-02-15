import { FunctionComponent } from 'preact';
import { res } from 'options/utils';

const Header: FunctionComponent = () => {
    return (
        <>
            <h1 id="top">
                <img src="../icons/icon128.png" alt="Shopper" class="logo-head" />
                Shopper – {res('optionsTitle')}
            </h1>
            <p>{res('optionsIntro')}</p>
        </>
    );
};

export { Header };
