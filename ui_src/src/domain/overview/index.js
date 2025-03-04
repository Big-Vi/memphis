// Copyright 2022-2023 The Memphis.dev Authors
// Licensed under the Memphis Business Source License 1.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// Changed License: [Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0), as published by the Apache Foundation.
//
// https://github.com/memphisdev/memphis/blob/master/LICENSE
//
// Additional Use Grant: You may make use of the Licensed Work (i) only as part of your own product or service, provided it is not a message broker or a message queue product or service; and (ii) provided that you do not use, provide, distribute, or make available the Licensed Work as a Service.
// A "Service" is a commercial offering, product, hosted, or managed service, that allows third parties (other than your own employees and contractors acting on your behalf) to access and/or use the Licensed Work or a substantial set of the features or functionality of the Licensed Work to third parties as a software-as-a-service, platform-as-a-service, infrastructure-as-a-service or other similar services that compete with Licensor products or services.

import './style.scss';

import React, { useEffect, useContext, useState, useRef } from 'react';
import { StringCodec, JSONCodec } from 'nats.ws';

import {
    LOCAL_STORAGE_ALREADY_LOGGED_IN,
    LOCAL_STORAGE_AVATAR_ID,
    LOCAL_STORAGE_FULL_NAME,
    LOCAL_STORAGE_USER_NAME,
    LOCAL_STORAGE_SKIP_GET_STARTED,
    LOCAL_STORAGE_BROKER_HOST,
    LOCAL_STORAGE_ENV,
    LOCAL_STORAGE_ACCOUNT_ID,
    USER_IMAGE
} from '../../const/localStorageConsts';
import { ReactComponent as StationIcon } from '../../assets/images/stationsIconActive.svg';
import CreateStationForm from '../../components/createStationForm';
import { capitalizeFirst, isCloud } from '../../services/valueConvertor';
import { ApiEndpoints } from '../../const/apiEndpoints';
import { httpRequest } from '../../services/http';
import SystemComponents from './systemComponents';
import GenericDetails from './genericDetails';
import Stations from './stations';
import Tags from './tags';
import Integrations from './integrations';
import Usage from './usage';
import Loader from '../../components/loader';
import Button from '../../components/button';
import { Context } from '../../hooks/store';
import Modal from '../../components/modal';
import AsyncTasks from '../../components/asyncTasks';
import GetStarted from './getStarted';
import Throughput from './throughput';
import Copy from '../../components/copy';
import StreamLineage from '../streamLineage';

const dataSentences = [
    `“Data is the new oil” — Clive Humby`,
    `“With data collection, ‘the sooner the better’ is always the best answer” — Marissa Mayer`,
    `“Data are just summaries of thousands of stories – tell a few of those stories to help make the data meaningful” — Chip and Dan Heath`,
    `“Data really powers everything that we do” — Jeff Weiner`,
    `“Without big data, you are blind and deaf and in the middle of a freeway” — Geoffrey Moore`
];

function OverView() {
    const [state, dispatch] = useContext(Context);
    const [open, modalFlip] = useState(false);
    const createStationRef = useRef(null);
    const [botUrl, SetBotUrl] = useState(require('../../assets/images/bots/avatar1.svg'));
    const [username, SetUsername] = useState('');
    const [isLoading, setisLoading] = useState(true);
    const [creatingProsessd, setCreatingProsessd] = useState(false);
    const [lineageExpend, setExpend] = useState(false);

    const [dataSentence, setDataSentence] = useState(dataSentences[0]);

    const getRandomInt = (max) => {
        return Math.floor(Math.random() * max);
    };

    const generateSentence = () => {
        setDataSentence(dataSentences[getRandomInt(5)]);
    };

    const arrangeData = (data) => {
        data.stations?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        data.delayed_cgs?.sort(function (a, b) {
            let nameA = a.station_name.toUpperCase();
            let nameB = b.station_name.toUpperCase();
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });
        data.system_components?.sort(function (a, b) {
            let nameA = a.name.toUpperCase();
            let nameB = b.name.toUpperCase();
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });
        data.system_components?.map((a) => {
            a.ports?.sort(function (a, b) {
                if (a < b) {
                    return -1;
                }
                if (a > b) {
                    return 1;
                }
                return 0;
            });
        });
        dispatch({ type: 'SET_MONITOR_DATA', payload: data });
    };

    const getOverviewData = async () => {
        setisLoading(true);
        try {
            const data = await httpRequest('GET', ApiEndpoints.GET_MAIN_OVERVIEW_DATA);
            arrangeData(data);
            setisLoading(false);
        } catch (error) {
            setisLoading(false);
        }
    };

    useEffect(() => {
        dispatch({ type: 'SET_ROUTE', payload: 'overview' });
        getOverviewData();
        setBotImage(localStorage.getItem(LOCAL_STORAGE_AVATAR_ID) || state?.userData?.avatar_id);
        SetUsername(
            localStorage.getItem(LOCAL_STORAGE_FULL_NAME) !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_FULL_NAME) !== ''
                ? capitalizeFirst(localStorage.getItem(LOCAL_STORAGE_FULL_NAME))
                : capitalizeFirst(localStorage.getItem(LOCAL_STORAGE_USER_NAME))
        );
        generateSentence();
    }, []);

    useEffect(() => {
        const sc = StringCodec();
        const jc = JSONCodec();
        let sub;
        const subscribeToOverviewData = async () => {
            try {
                const rawBrokerName = await state.socket?.request(`$memphis_ws_subs.main_overview_data`, sc.encode('SUB'));

                if (rawBrokerName) {
                    const brokerName = JSON.parse(sc.decode(rawBrokerName?._rdata))['name'];
                    sub = state.socket?.subscribe(`$memphis_ws_pubs.main_overview_data.${brokerName}`);
                    listenForUpdates();
                }
            } catch (err) {
                console.error('Error subscribing to overview data:', err);
            }
        };

        const listenForUpdates = async () => {
            try {
                if (sub) {
                    for await (const msg of sub) {
                        let data = jc.decode(msg.data);
                        arrangeData(data);
                    }
                }
            } catch (err) {
                console.error('Error receiving overview data updates:', err);
            }
        };

        subscribeToOverviewData();
        return () => {
            if (sub) {
                try {
                    sub.unsubscribe();
                } catch (err) {
                    console.error('Error unsubscribing from overview data:', err);
                }
            }
        };
    }, [state.socket]);

    const setBotImage = (botId) => {
        SetBotUrl(require(`../../assets/images/bots/avatar${botId}.svg`));
    };

    let host =
        localStorage.getItem(LOCAL_STORAGE_ENV) === 'docker'
            ? 'localhost'
            : localStorage.getItem(LOCAL_STORAGE_BROKER_HOST)
            ? localStorage.getItem(LOCAL_STORAGE_BROKER_HOST)
            : 'memphis.memphis.svc.cluster.local';

    return (
        <div className="overview-container">
            {isLoading && (
                <div className="loader-uploading">
                    <Loader />
                </div>
            )}
            {!isLoading && localStorage.getItem(LOCAL_STORAGE_SKIP_GET_STARTED) === 'true' && (
                <div className="overview-wrapper">
                    <div className="header">
                        <div className="header-welcome">
                            <div className="bot-wrapper">
                                <img
                                    className="avatar-image"
                                    src={localStorage.getItem(USER_IMAGE) && localStorage.getItem(USER_IMAGE) !== 'undefined' ? localStorage.getItem(USER_IMAGE) : botUrl}
                                    referrerPolicy="no-referrer"
                                    width={localStorage.getItem(USER_IMAGE) && localStorage.getItem(USER_IMAGE) !== 'undefined' ? 60 : 40}
                                    height={localStorage.getItem(USER_IMAGE) && localStorage.getItem(USER_IMAGE) !== 'undefined' ? 60 : 40}
                                    alt="avatar"
                                ></img>
                            </div>
                            <div className="dynamic-sentences">
                                {localStorage.getItem(LOCAL_STORAGE_ALREADY_LOGGED_IN) === 'true' ? (
                                    <h1>
                                        Welcome back, <span className="username">{username}</span>
                                    </h1>
                                ) : (
                                    <h1>
                                        Welcome, <span className="username">{username}</span>
                                    </h1>
                                )}
                                <div className="org-details">
                                    {isCloud() && (
                                        <div className="hostname">
                                            <p>Account ID : </p>
                                            <span>{localStorage.getItem(LOCAL_STORAGE_ACCOUNT_ID)}</span>
                                            <Copy width="12" data={localStorage.getItem(LOCAL_STORAGE_ACCOUNT_ID)} />
                                        </div>
                                    )}
                                    <div className="hostname">
                                        <p>Broker hostname : </p>
                                        <span>{host}</span>
                                        <Copy width="12" data={host} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="btn-section">
                            <AsyncTasks height={'32px'} overView />
                            <Button
                                className="modal-btn"
                                width="160px"
                                height="34px"
                                placeholder={'Create new station'}
                                colorType="white"
                                radiusType="circle"
                                backgroundColorType="purple"
                                fontSize="12px"
                                fontWeight="600"
                                aria-haspopup="true"
                                boxShadowStyle="float"
                                onClick={() => modalFlip(true)}
                            />
                        </div>
                    </div>
                    {!lineageExpend ? (
                        <>
                            <div className="top-component">
                                <GenericDetails />
                            </div>
                            {isCloud() ? (
                                <div className="overview-components overview-components-cloud">
                                    <div className="left-side">
                                        <StreamLineage createStationTrigger={(e) => modalFlip(e)} setExpended={(e) => setExpend(e)} expend={lineageExpend} />
                                        <Throughput />
                                    </div>
                                    <div className={state?.monitor_data?.billing_details?.is_free_plan ? 'right-side free-cloud' : 'right-side cloud'}>
                                        <Stations createStationTrigger={(e) => modalFlip(e)} />
                                        <Tags />
                                        {state?.monitor_data?.billing_details?.is_free_plan ? <Usage /> : <Integrations />}
                                    </div>
                                </div>
                            ) : (
                                <div className="overview-components">
                                    <div className="left-side">
                                        <Stations createStationTrigger={(e) => modalFlip(e)} />
                                        <Throughput />
                                    </div>

                                    <div className="right-side">
                                        <SystemComponents />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <StreamLineage setExpended={(e) => setExpend(e)} expend={lineageExpend} />
                    )}
                </div>
            )}
            {!isLoading && localStorage.getItem(LOCAL_STORAGE_SKIP_GET_STARTED) !== 'true' && (
                <GetStarted username={username} dataSentence={dataSentence} skip={() => getOverviewData()} />
            )}
            <Modal
                header={
                    <div className="modal-header">
                        <div className="header-img-container">
                            <StationIcon className="headerImage" alt="stationImg" />
                        </div>
                        <p>Create new station</p>
                        <label>A station is a distributed unit that stores the produced data.</label>
                    </div>
                }
                height="65vh"
                width="1020px"
                rBtnText="Create"
                lBtnText="Cancel"
                lBtnClick={() => {
                    modalFlip(false);
                }}
                rBtnClick={() => {
                    createStationRef.current();
                }}
                clickOutside={() => modalFlip(false)}
                open={open}
                isLoading={creatingProsessd}
            >
                <CreateStationForm createStationFormRef={createStationRef} setLoading={(e) => setCreatingProsessd(e)} />
            </Modal>
        </div>
    );
}

export default OverView;
