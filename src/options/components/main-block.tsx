import { FunctionComponent } from 'preact';
import { Shortcuts } from './shortcuts';
import { Footer } from './footer';

const MainBlock: FunctionComponent = () => {
    return (
        <>
            <Shortcuts />
            <Footer />
        </>
    );
};

export { MainBlock };
