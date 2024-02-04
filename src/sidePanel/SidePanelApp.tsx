import React, { useEffect, useRef } from 'react';
import { DeleteIcon } from '@chakra-ui/icons'
import { 
  Box, Button, Container, Flex, Heading, Link, 
  List,
  ListItem,
  SimpleGrid,
  Text
} from "@chakra-ui/react";

import LoadingSpinner from 'src/components/LoadingSpinner';
import { useAppSelector } from "src/state/hooks/useAppDispatch";
import { setWDLink } from 'src/state/slices/content';
import PortNames from 'src/types/PortNames';
import WDLink from 'src/types/WDLink';
import { wdLinkUpdate } from 'src/util/wdLinkUtil';

const SidePanelApp = () => {
  const initLink = [{} as chrome.bookmarks.BookmarkTreeNode];
  const port = useRef<chrome.runtime.Port>();
  const [isConnected, setIsConnected] = React.useState(false);
  const [linkList, setList] = React.useState(initLink);
  const [folderId, setFolderId] = React.useState('');
  const _wdLink = useAppSelector(state => state.content.wdLink);
  
  const connect = async () => {
    setWDLink({ title: '', url: '', tenant: '', proxy: '', stopProxy: '', login: '' });
    const sidePanelPort = chrome.runtime.connect({ name: PortNames.SidePanelPort });
    port.current = sidePanelPort;
    sidePanelPort.postMessage({ type: 'init', message: 'init from panel open' });      

    sidePanelPort.onMessage.addListener(message => {
      if (message.type === 'handle-init') {
        setIsConnected(true);
        loadBookmarks();
      }

      if (message.type === 'tab-updated') {
        sidePanelPort.postMessage({ type: 'init', message: 'init from tab connected' });
      }
    });
  };

  useEffect(() => {
    connect();
  }, []);

  const loadBookmarks = () => {chrome.bookmarks.getTree((tree: chrome.bookmarks.BookmarkTreeNode[]) => {

    const wdSideKickTitle = "WD Sidekick";   

    var topFolders = tree[0].children;
    var otherBookmarks: chrome.bookmarks.BookmarkTreeNode = {
      title: '',
      id: ''
    };
    var wdSideKickBookmarks: chrome.bookmarks.BookmarkTreeNode = {
      title: '',
      id: ''
    };

      topFolders?.forEach(function(folder) {
          if (folder.title === "Other bookmarks") {
            otherBookmarks = folder;
            if (otherBookmarks.children) {
              otherBookmarks.children.forEach(function(obFolder) {
                if (obFolder.title === wdSideKickTitle) {
                  setFolderId(obFolder.id);
                  wdSideKickBookmarks = obFolder;
                }
              });
            }
          }
      });

      if (wdSideKickBookmarks.title.length === 0 && otherBookmarks.id.length !== 0) {
        chrome.bookmarks.create({ 
          title: wdSideKickTitle, 
          parentId: otherBookmarks.id 
        });

        return;
      }

      if (wdSideKickBookmarks) {
          if (wdSideKickBookmarks.children) {
            displayBookmarks(wdSideKickBookmarks.children);
          }
        }
      }
  )};
  
  // Recursively display the bookmarks
  function displayBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
    while(linkList.length > 0) {
      linkList.pop();
    }

    for (const node of nodes) {
      // If the node is a bookmark, create a list item and append it to the parent node
      if (node.url) {
        linkList.push(node);
        setList(linkList);
      }
    }
  }

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noreferrer');    
  };

  const saveBookmark = (link: WDLink, id: string) => {
    if (link.title.length > 0 && link.url.length > 0 && id.length > 0) {
      chrome.bookmarks.create({ 
        title: link.title, 
        url: link.url,
        parentId: id
      });
    }

    refresh();
  };

  const deleteBookmark = (id: string) => {
    if (id.length > 0) {
      chrome.bookmarks.remove(id);
    }

    refresh();
  };  

  const refresh = () => {
    window.location.reload();  
  };

  if (!isConnected) {
    return (
      <Box height="100vh">
        <LoadingSpinner />
      </Box>
    );
  }

  return (
      <Container bg='gray.100' 
        minH={'100vh'}
        overflowY={'hidden'}
        textAlign={'left'}
      >
      <Container mt={2} textAlign={'center'}>
        <Button
          size='sm'
          title='Save Bookmark'          
          onClick={() => saveBookmark(_wdLink, folderId)}
        >Save Bookmark</Button>
        <Button
          size='sm'
          title='Refresh'       
          onClick={() => refresh()}
        >Refresh</Button>
      </Container>
      <Container mt={4} textAlign={'center'} ><Heading size={'md'}>Bookmark Preview</Heading></Container>
      <Container bg="white" rounded="md" p={2} mt={2} key="{_wdLink.text}">            
          <Text fontWeight={'bold'}>{_wdLink.title}</Text>
          <p>
            {_wdLink.title && _wdLink.title.length > 0 ?   
              (<Link
                role="link"
                title='See in New Tab'
                onClick={() => openInNewTab(_wdLink.url)}
              >
                New Tab
              </Link>)
            : ""}
            {_wdLink.proxy && _wdLink.proxy.length > 0 ? 
              (<Link
                role="link"
                title='Start Proxy'
                ml={4}
                onClick={() => openInNewTab( _wdLink.proxy)}
              >
                Start Proxy
              </Link>)
            : ""}
            { _wdLink.stopProxy && _wdLink.stopProxy.length > 0 ? 
              (<Link
                role="link"
                title='Stop Proxy'
                ml={4}
                onClick={() => openInNewTab( _wdLink.stopProxy)}
              >
                Stop Proxy
              </Link>)
            : ""}
           { _wdLink.login && _wdLink.login.length > 0 ? 
              (<Link
                role="link"
                title='Login'
                ml={4}
                onClick={() => openInNewTab( _wdLink.login)}
              >
                Login
              </Link>)
            : ""}            
          </p>
          </Container>
        <Container mt={6} textAlign={'center'} ><Heading size={'md'}>WD Sidekick Bookmarks</Heading></Container>
        <SimpleGrid mt={2}>
          <List size="xl" variant="custom" spacing={5}>
            {linkList.map(item => {
              let wdLink = { title: item.title, url: item.url, tenant: '', proxy: '', stopProxy: '', login: '' } as WDLink;
              wdLink = wdLinkUpdate( wdLink );
              return (
                <ListItem  bg="white" rounded="md" p={2} mt={2} >
                  <Flex>
                    <Box w='95%'>
                      <Text fontWeight={'bold'}>
                        { wdLink.tenant.length > 0 ? '[' + wdLink.tenant + '] - ' + item.title : item.title }
                      </Text>
                      <p>
                      <Link                   
                        role="link"
                        title='See in New Tab'
                        onClick={() => openInNewTab(item.url + '')}>
                          New Tab
                      </Link>
                      { wdLink.proxy.length > 0 ? 
                      (<Link
                          role="link"
                          title='Start Proxy'
                          ml={4}
                          onClick={() => openInNewTab(wdLink.proxy)}                    
                        >
                          Start Proxy
                        </Link>)
                        : "" }
                      { wdLink.stopProxy.length > 0 ? 
                        (<Link
                          role="link"
                          title='Stop Proxy'
                          ml={4}
                          onClick={() => openInNewTab( wdLink.stopProxy)}
                        >
                          Stop Proxy
                        </Link>)
                      : ""}
                      { wdLink.login.length > 0 ? 
                        (<Link
                          role="link"
                          title='Login'
                          ml={4}
                          onClick={() => openInNewTab( wdLink.login)}
                        >
                          Login
                        </Link>)
                      : ""}                      

                        </p>
                      </Box>
                    <Box textAlign={'right'}>
                        <Button
                          size={'xs'}
                          onClick={() => deleteBookmark(item.id)}
                        >
                          <DeleteIcon boxSize={3} />
                        </Button>
                    </Box>
                    </Flex>
                </ListItem>
              )
            })}
            </List>
            </SimpleGrid>
      </Container>
    );
};

export default SidePanelApp;
